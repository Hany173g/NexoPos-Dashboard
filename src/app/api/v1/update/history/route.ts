import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const licenseKey = request.headers.get('x-license-key');

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, message: 'Missing license key' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey }
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: 'License not found' },
        { status: 404 }
      );
    }

    const versions = await prisma.version.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        version: true,
        releaseNotes: true,
        isForced: true,
        createdAt: true
      }
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Get update history error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
