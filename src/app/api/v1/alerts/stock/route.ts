import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_ALERTS_URL || "http://localhost:5000";

export async function POST(request: Request) {
  try {
    const { licenseKey, storeName, products } = await request.json();

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ error: "Valid licenseKey required" }, { status: 400 });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "products array required" }, { status: 400 });
    }

    for (const p of products) {
      if (!p.name || typeof p.name !== "string" || typeof p.stock !== "number" || typeof p.minStock !== "number") {
        return NextResponse.json({ error: "Each product must have name (string), stock (number), minStock (number)" }, { status: 400 });
      }
      if (p.name.length > 200) {
        return NextResponse.json({ error: "Product name too long" }, { status: 400 });
      }
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`stock-alert:${licenseKey}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    if (license.status !== "active") {
      return NextResponse.json({ error: "License is not active" }, { status: 403 });
    }

    const alertMessage = buildAlertMessage(storeName || license.storeName, products);

    const subscription = await prisma.telegramSubscription.findUnique({
      where: { licenseKey },
    });

    if (subscription && TELEGRAM_BOT_TOKEN) {
      const telegramResp = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: parseInt(subscription.chatId),
            text: alertMessage,
            parse_mode: "HTML",
          }),
        }
      );

      if (telegramResp.ok) {
        return NextResponse.json({ success: true, source: "direct" });
      }
    }

    const fallbackResp = await fetch(`${TELEGRAM_BOT_URL}/send-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        license_key: licenseKey,
        message: alertMessage,
      }),
    });

    if (!fallbackResp.ok) {
      const errText = await fallbackResp.text();
      return NextResponse.json({ error: "Failed to send alert", details: errText }, { status: 502 });
    }

    return NextResponse.json({ success: true, source: "fallback" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildAlertMessage(storeName: string, products: { name: string; stock: number; minStock: number }[]): string {
  const productLines = products
    .map((p) => `🔸 <b>${escapeHtml(p.name)}</b>\n📦 المخزون الحالي: <b>${p.stock}</b>\n⚠️ الحد الأدنى: <b>${p.minStock}</b>`)
    .join("\n\n");

  return (
    `🚨 <b>⚠️ تنبيه مخزون منخفض</b>\n\n` +
    `🏪 <b>المتجر:</b> ${escapeHtml(storeName)}\n` +
    `📅 <b>التاريخ:</b> ${new Date().toLocaleString("ar-EG")}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `${productLines}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🔔 <b>يرجى مراجعة المخزون وتزويده في أقرب وقت ممكن.</b>`
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
