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
      return NextResponse.json(
        { success: false, message: 'No backups found' },
        { status: 404 }
      );
    }

    // Get all files and find the newest one
    const files = await fs.readdir(licenseBackupsDir);
    const fileInfoPromises = files.map(async (file) => {
      const fullPath = path.join(licenseBackupsDir, file);
      const stat = await fs.stat(fullPath);
      return { name: file, path: fullPath, mtime: stat.mtime };
    });

    const fileInfos = await Promise.all(fileInfoPromises);
    
    if (fileInfos.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No backups found' },
        { status: 404 }
      );
    }

    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Newest first
    const latestBackup = fileInfos[0];

    console.log('Latest backup found:', latestBackup.name);

    // Read and encode the file
    const fileBuffer = await fs.readFile(latestBackup.path);
    const base64Data = fileBuffer.toString('base64');

    console.log('File read successfully, base64 length:', base64Data.length);

    const response = {
      Data: base64Data,  // PascalCase for C#
      FileName: latestBackup.name,
      Date: latestBackup.mtime.toISOString()
    };

    console.log('Sending response with keys:', Object.keys(response));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get latest backup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
