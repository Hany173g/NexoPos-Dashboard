import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(licenses)
  } catch (error) {
    console.error("Error fetching licenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { storeName, storeType, plan, expiryDate } = await request.json()

    const generateLicenseKey = () => {
      const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase()
      return `ONL-${randomPart()}-${randomPart()}-${randomPart()}`
    }

    const license = await prisma.license.create({
      data: {
        key: generateLicenseKey(),
        storeName,
        storeType,
        plan,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: "pending",
      },
    })

    return NextResponse.json(license)
  } catch (error) {
    console.error("Error creating license:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
