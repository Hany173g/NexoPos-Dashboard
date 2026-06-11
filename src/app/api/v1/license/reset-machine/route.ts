import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    const { licenseKey, newMachineId } = await request.json();

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ success: false, error: "Invalid license key" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`reset-machine:${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ success: false, error: "Invalid license key" }, { status: 400 });
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (license.lastResetDate) {
      const timeSinceReset = Date.now() - license.lastResetDate.getTime();
      if (timeSinceReset < THIRTY_DAYS_MS) {
        return NextResponse.json({ success: false, error: "Machine reset not allowed yet" }, { status: 400 });
      }
    }

    const updatedLicense = await prisma.license.update({
      where: { key: licenseKey },
      data: {
        machineId: newMachineId || null,
        lastResetDate: new Date(),
        resetCount: license.resetCount + 1,
      },
    });

    return NextResponse.json({ success: true, message: "Machine ID reset successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
