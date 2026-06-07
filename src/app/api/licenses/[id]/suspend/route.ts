import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import prisma from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const licenseId = parseInt(params.id)

    const license = await prisma.license.findUnique({
      where: { id: licenseId },
    })

    if (!license) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      )
    }

    const updatedLicense = await prisma.license.update({
      where: { id: licenseId },
      data: { status: "suspended" },
    })

    return NextResponse.json({
      success: true,
      license: updatedLicense,
    })
  } catch (error) {
    console.error("Suspend error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
