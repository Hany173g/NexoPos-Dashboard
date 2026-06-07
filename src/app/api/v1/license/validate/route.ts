import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { licenseKey, machineId } = await request.json();

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ status: "invalid" }, { status: 200 });
    }

    if (license.status === "suspended") {
      return NextResponse.json({ status: "suspended" }, { status: 200 });
    }

    if (license.machineId !== machineId) {
      return NextResponse.json({ status: "invalid" }, { status: 200 });
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
