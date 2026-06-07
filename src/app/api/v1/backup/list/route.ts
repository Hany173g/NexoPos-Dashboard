import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

const BACKUPS_DIR = path.join(process.cwd(), 'uploads', 'backups');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Support both PascalCase (C#) and camelCase (JS)
    const licenseKey = searchParams.get('licenseKey') || searchParams.get('LicenseKey');

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, message: 'Missing licenseKey' },
        { status: 400 }
      );
    }

    // Verify license exists
    const license = await prisma.license.findUnique({
      where: { key: licenseKey }
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: 'License not found' },
        { status: 404 }
      );
    }

    const licenseBackupsDir = path.join(BACKUPS_DIR, licenseKey);

    // Check if directory exists
    try {
      await fs.access(licenseBackupsDir);
    } catch {
      return NextResponse.json([]);
    }

    // Get all files with info
    const files = await fs.readdir(licenseBackupsDir);
    const fileInfoPromises = files.map(async (file) => {
      const fullPath = path.join(licenseBackupsDir, file);
      const stat = await fs.stat(fullPath);
      return {
        fileName: file,
        date: stat.mtime,
        size: stat.size
      };
    });

    const fileInfos = await Promise.all(fileInfoPromises);
    fileInfos.sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first

    return NextResponse.json(fileInfos);
  } catch (error) {
    console.error('Get backup list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
