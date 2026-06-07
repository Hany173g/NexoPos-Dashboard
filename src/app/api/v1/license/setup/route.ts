import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { licenseKey, machineId } = await request.json()

    if (!licenseKey || !machineId) {
      return NextResponse.json(
        { error: "License key and machine ID are required" },
        { status: 400 }
      )
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    })

    if (!license) {
      return NextResponse.json(
        { error: "Invalid license key" },
        { status: 404 }
      )
    }

    if (license.status === "suspended") {
      return NextResponse.json(
        { error: "License is suspended" },
        { status: 403 }
      )
    }

    if (license.status === "expired") {
      return NextResponse.json(
        { error: "License is expired" },
        { status: 403 }
      )
    }

    // Update the license with machine ID and activate it
    const updatedLicense = await prisma.license.update({
      where: { key: licenseKey },
      data: {
        machineId,
        status: "active",
      },
    })

    return NextResponse.json({
      success: true,
      status: updatedLicense.status,
      expiryDate: updatedLicense.expiryDate,
      storeName: updatedLicense.storeName,
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
