import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const { license_key, chat_id } = await request.json();

    if (!license_key || typeof license_key !== "string" || license_key.length > 100) {
      return NextResponse.json({ valid: false, error: "Valid license key is required" });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`telegram-validate:${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ valid: false, error: `Too many attempts. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: license_key },
    });

    if (!license) {
      return NextResponse.json({ valid: false, status: "not_found", error: "License not found" });
    }

    const now = new Date();
    if (license.expiryDate && now > license.expiryDate) {
      return NextResponse.json({ valid: false, status: "expired", error: "License is expired" });
    }

    if (license.status === "suspended") {
      return NextResponse.json({ valid: false, status: "suspended", error: "الترخيص متوقف تواصل مع الدعم الفني" });
    }

    if (chat_id && typeof chat_id === "number") {
      const existing = await prisma.telegramSubscription.findUnique({
        where: { licenseKey: license_key },
      });

      if (existing && existing.chatId !== chat_id.toString()) {
        return NextResponse.json({ valid: false, error: "This license is already linked to another Telegram chat" });
      }
    }

    return NextResponse.json({
      valid: true,
      storeName: license.storeName,
      plan: license.plan,
      expiryDate: license.expiryDate,
      machineId: license.machineId,
    });
  } catch (error) {
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
