import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { chat_id, license_key } = await request.json();

    if (!chat_id || typeof chat_id !== "number" && typeof chat_id !== "string") {
      return NextResponse.json({ error: "Valid chat_id required" }, { status: 400 });
    }
    if (!license_key || typeof license_key !== "string") {
      return NextResponse.json({ error: "Valid license_key required" }, { status: 400 });
    }

    const license = await prisma.license.findUnique({
      where: { key: license_key },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    if (license.status !== "active") {
      return NextResponse.json({ error: "License is not active" }, { status: 403 });
    }

    const chatIdStr = chat_id.toString();

    const existing = await prisma.telegramSubscription.findUnique({
      where: { licenseKey: license_key },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Chat already registered for this license",
        chatId: existing.chatId,
      });
    }

    const duplicateChat = await prisma.telegramSubscription.findFirst({
      where: { chatId: chatIdStr },
    });

    if (duplicateChat) {
      await prisma.telegramSubscription.delete({
        where: { id: duplicateChat.id },
      });
    }

    await prisma.telegramSubscription.create({
      data: {
        chatId: chatIdStr,
        licenseKey: license_key,
      },
    });

    return NextResponse.json({ success: true, message: "Chat registered successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
