import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const { licenseKey, machineId } = await request.json();

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ status: "invalid" });
    }
    if (!machineId || typeof machineId !== "string") {
      return NextResponse.json({ status: "invalid" });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`validate:${licenseKey}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ status: "rate_limited" }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ status: "invalid" });
    }

    if (license.status === "suspended") {
      return NextResponse.json({ status: "suspended" });
    }

    if (license.machineId !== machineId) {
      return NextResponse.json({ status: "invalid" });
    }

    let status = license.status;
    let daysLeft: number | null = null;

    if (license.expiryDate) {
      const now = new Date();
      const diff = license.expiryDate.getTime() - now.getTime();
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

      if (daysLeft <= 0) {
        status = "expired";
      }
    }

    return NextResponse.json({
      status,
      expiryDate: license.expiryDate,
      daysLeft,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
