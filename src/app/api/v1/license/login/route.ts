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

    // Check if no machine ID is set - this means it was reset, so we set it
    if (!license.machineId) {
      const updatedLicense = await prisma.license.update({
        where: { key: licenseKey },
        data: {
          machineId,
          status: "active",
        },
      })

      let licenseStatus = "active"
      let daysLeft = null

      if (updatedLicense.expiryDate) {
        const now = new Date()
        const diff = updatedLicense.expiryDate.getTime() - now.getTime()
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

        if (daysLeft <= 0) {
          licenseStatus = "expired"
          // Update the status in database
          await prisma.license.update({
            where: { key: licenseKey },
            data: { status: "expired" },
          })
        }
      }

      return NextResponse.json({
        success: true,
        status: licenseStatus,
        expiryDate: updatedLicense.expiryDate,
        storeName: updatedLicense.storeName,
        daysLeft,
      })
    }

    // Check if machine ID matches
    if (license.machineId !== machineId) {
      return NextResponse.json(
        { error: "Machine ID mismatch - license is used on another device" },
        { status: 403 }
      )
    }

    // Check expiry
    let licenseStatus = license.status
    let daysLeft = null

    if (license.expiryDate) {
      const now = new Date()
      const diff = license.expiryDate.getTime() - now.getTime()
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

      if (daysLeft <= 0) {
        licenseStatus = "expired"
        // Update the status in database
        await prisma.license.update({
          where: { key: licenseKey },
          data: { status: "expired" },
        })
      }
    }

    return NextResponse.json({
      success: true,
      status: licenseStatus,
      expiryDate: license.expiryDate,
      storeName: license.storeName,
      daysLeft,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
