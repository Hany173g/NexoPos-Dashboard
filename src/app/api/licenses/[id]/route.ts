import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import prisma from "@/lib/prisma"

export async function GET(
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
      include: { payments: true },
    })

    if (!license) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(license)
  } catch (error) {
    console.error("Error fetching license:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
