import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { licenseKey, newMachineId } = await request.json();

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
        machineId: newMachineId,
        lastResetDate: new Date(),
        resetCount: license.resetCount + 1,
      },
    });

    return NextResponse.json({ success: true, message: "Machine ID reset successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
