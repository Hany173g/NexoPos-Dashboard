import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter"

export async function POST(request: Request) {
  try {
    const { licenseKey, machineId } = await request.json()

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ error: "Valid license key required" }, { status: 400 })
    }
    if (!machineId || typeof machineId !== "string" || machineId.length > 200) {
      return NextResponse.json({ error: "Valid machine ID required" }, { status: 400 })
    }

    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`login:${licenseKey}`, 10, 60000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 })
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    })

    if (!license) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 404 })
    }

    if (license.status === "suspended") {
      return NextResponse.json({ success: false, status: "suspended", error: "License is suspended" }, { status: 403 })
    }

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

    if (license.machineId !== machineId) {
      return NextResponse.json({ success: false, status: "invalid_machine", error: "Machine ID mismatch - license is used on another device" }, { status: 403 })
    }

    let licenseStatus = license.status
    let daysLeft = null

    if (license.expiryDate) {
      const now = new Date()
      const diff = license.expiryDate.getTime() - now.getTime()
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

      if (daysLeft <= 0) {
        licenseStatus = "expired"
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
