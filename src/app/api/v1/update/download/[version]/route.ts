import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

const VERSIONS_DIR = path.join(process.cwd(), 'uploads', 'versions');

export async function GET(
  request: Request,
  { params }: { params: { version: string } }
) {
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

    const versionEntry = await prisma.version.findUnique({
      where: { version: params.version }
    });

    if (!versionEntry) {
      return NextResponse.json(
        { success: false, message: 'Version not found' },
        { status: 404 }
      );
    }

    const fileName = `NexoPOS_v${params.version}.exe`;
    const filePath = path.join(VERSIONS_DIR, fileName);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Download update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
