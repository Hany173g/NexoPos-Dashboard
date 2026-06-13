import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_ALERTS_URL || "http://localhost:5000";

const VALID_TYPES = ["shift_report", "stock_alert", "login", "subscription_expiry", "daily_report"];

export async function POST(request: Request) {
  try {
    const { licenseKey, type, data } = await request.json();

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ error: "Valid licenseKey required" }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "data object required" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`alert-send:${licenseKey}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const license = await prisma.license.findUnique({ where: { key: licenseKey } });
    if (!license || (license.status !== "active" && license.status !== "pending")) {
      return NextResponse.json({ error: "License not found or not active" }, { status: 404 });
    }

    const message = buildMessage(type, data, license.storeName);

    const subscription = await prisma.telegramSubscription.findUnique({ where: { licenseKey } });
    if (subscription && TELEGRAM_BOT_TOKEN) {
      const telegramResp = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: parseInt(subscription.chatId),
            text: message,
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
      body: JSON.stringify({ license_key: licenseKey, message }),
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

function buildMessage(type: string, data: any, storeName: string): string {
  switch (type) {
    case "shift_report":
      return buildShiftReport(data, storeName);
    case "stock_alert":
      return buildStockAlert(data, storeName);
    case "login":
      return buildLoginAlert(data);
    case "subscription_expiry":
      return buildSubscriptionExpiry(data);
    case "daily_report":
      return buildDailyReport(data, storeName);
    default:
      return "Unknown notification type";
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatCurrency(amount: number, currency = "ج.م"): string {
  return `${amount.toLocaleString("ar-EG")} ${currency}`;
}

/* ───── 1. Shift Report ───── */
function buildShiftReport(data: any, storeName: string): string {
  return (
    `🏪 <b>CashFlow — تقرير الوردية</b>\n\n` +
    `📅 <b>التاريخ:</b> ${escapeHtml(data.date || "")}\n` +
    `👤 <b>الكاشير:</b> ${escapeHtml(data.cashierName || "")}\n` +
    `⏰ <b>من</b> ${escapeHtml(data.fromTime || "")} <b>إلى</b> ${escapeHtml(data.toTime || "")}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 <b>إجمالي المبيعات:</b> ${formatCurrency(data.totalSales || 0)}\n` +
    `🧾 <b>عدد الفواتير:</b> ${data.invoiceCount || 0}\n` +
    `💵 <b>كاش:</b> ${formatCurrency(data.cashSales || 0)}\n` +
    `💳 <b>كارت:</b> ${formatCurrency(data.cardSales || 0)}\n` +
    `📱 <b>محفظة:</b> ${formatCurrency(data.walletSales || 0)}\n` +
    `📦 <b>متوسط الفاتورة:</b> ${formatCurrency(data.averageInvoice || 0)}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `✅ <b>تم إغلاق الوردية بنجاح</b>`
  );
}

/* ───── 2. Stock Alert ───── */
function buildStockAlert(data: any, storeName: string): string {
  const productLines = (data.products || [])
    .map((p: any) =>
      `🔸 <b>${escapeHtml(p.name)}</b>\n📦 المخزون الحالي: <b>${p.stock}</b>\n⚠️ الحد الأدنى: <b>${p.minStock}</b>`
    )
    .join("\n\n");

  return (
    `⚠️ <b>تنبيه مخزون منخفض</b>\n\n` +
    `🏪 <b>المتجر:</b> ${escapeHtml(storeName)}\n` +
    `📅 <b>التاريخ:</b> ${new Date().toLocaleString("ar-EG")}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `${productLines}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🔔 <b>يرجى مراجعة المخزون وتزويده في أقرب وقت ممكن.</b>`
  );
}

/* ───── 3. Login Alert ───── */
function buildLoginAlert(data: any): string {
  return (
    `🔐 <b>تسجيل دخول جديد</b>\n\n` +
    `👤 <b>المستخدم:</b> ${escapeHtml(data.username || "")}\n` +
    `⏰ <b>الوقت:</b> ${escapeHtml(data.time || "")}\n` +
    `📅 <b>التاريخ:</b> ${escapeHtml(data.date || "")}\n` +
    `💻 <b>الجهاز:</b> ${escapeHtml(data.machineName || "")}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🟢 <b>تم تسجيل الدخول بنجاح</b>`
  );
}

/* ───── 4. Subscription Expiry ───── */
function buildSubscriptionExpiry(data: any): string {
  const daysLeft = data.daysLeft ?? 0;
  const warningEmoji = daysLeft <= 3 ? "🚨" : daysLeft <= 7 ? "⏳" : "📅";

  return (
    `${warningEmoji} <b>تنبيه انتهاء الاشتراك</b>\n\n` +
    `🏪 <b>المتجر:</b> ${escapeHtml(data.storeName || "")}\n` +
    `📅 <b>تاريخ الانتهاء:</b> ${escapeHtml(data.expiryDate || "")}\n` +
    `${warningEmoji} <b>باقي</b> ${daysLeft} <b>أيام على انتهاء الاشتراك</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📞 <b>للتجديد يرجى التواصل مع الدعم الفني</b>\n` +
    `📱 <b>واتساب:</b> 01013133376\n` +
    `📘 <b>فيسبوك:</b> https://www.facebook.com/omar.ballouz.2025`
  );
}

/* ───── 5. Daily Report ───── */
function buildDailyReport(data: any, storeName: string): string {
  const lowStockItems = (data.lowStockProducts || [])
    .map((p: any) => `🔸 ${escapeHtml(p.name)} (المتبقي: ${p.stock})`)
    .join("\n");

  return (
    `📊 <b>ملخص يوم ${escapeHtml(data.date || "")}</b>\n\n` +
    `🏪 <b>المتجر:</b> ${escapeHtml(storeName)}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 <b>المبيعات:</b> ${formatCurrency(data.totalSales || 0)}\n` +
    `🧾 <b>الفواتير:</b> ${data.invoiceCount || 0}\n` +
    `👥 <b>الكاشيرين:</b> ${data.cashierCount || 0}\n` +
    `${data.totalDiscount ? `🏷️ <b>الخصومات:</b> ${formatCurrency(data.totalDiscount)}\n` : ""}` +
    `\n📦 <b>منتجات نفدت:</b> ${data.outOfStockCount || 0}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    (lowStockItems
      ? `⚠️ <b>منتجات تحتاج تزويد:</b>\n${lowStockItems}\n\n━━━━━━━━━━━━━━━━━━\n\n`
      : "") +
    `✅ <b>تم التحديث بنجاح</b>`
  );
}
