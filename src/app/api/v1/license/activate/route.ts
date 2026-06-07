import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { licenseKey, machineId } = await request.json();

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
