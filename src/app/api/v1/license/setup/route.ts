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
    const rateCheck = checkRateLimit(`setup:${licenseKey}`, 5, 60000)
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

    if (license.status === "expired") {
      return NextResponse.json({ success: false, status: "expired", error: "License is expired" }, { status: 403 })
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
