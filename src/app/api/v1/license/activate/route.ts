import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const { licenseKey, machineId } = await request.json();

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ error: "Valid license key required" }, { status: 400 });
    }
    if (!machineId || typeof machineId !== "string" || machineId.length > 200) {
      return NextResponse.json({ error: "Valid machine ID required" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`activate:${licenseKey}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 400 });
    }

    if (license.status === "active" && license.machineId && license.machineId !== machineId) {
      return NextResponse.json({ error: "License already activated on another machine" }, { status: 400 });
    }

    const updatedLicense = await prisma.license.update({
      where: { key: licenseKey },
      data: {
        status: "active",
        machineId,
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedLicense.status,
      expiryDate: updatedLicense.expiryDate,
      storeName: updatedLicense.storeName,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
