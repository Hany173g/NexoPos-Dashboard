import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

const BACKUPS_DIR = path.join(process.cwd(), 'uploads', 'backups');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('licenseKey') || searchParams.get('LicenseKey');

    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing licenseKey' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`backup-latest:${licenseKey}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey }
    });

    if (!license) {
      return NextResponse.json({ success: false, message: 'License not found' }, { status: 404 });
    }

    const licenseBackupsDir = path.join(BACKUPS_DIR, licenseKey);

    try {
      await fs.access(licenseBackupsDir);
    } catch {
      return NextResponse.json({ success: false, message: 'No backups found' }, { status: 404 });
    }

    const files = await fs.readdir(licenseBackupsDir);
    const fileInfoPromises = files.map(async (file) => {
      const fullPath = path.join(licenseBackupsDir, file);
      const stat = await fs.stat(fullPath);
      return { name: file, path: fullPath, mtime: stat.mtime };
    });

    const fileInfos = await Promise.all(fileInfoPromises);

    if (fileInfos.length === 0) {
      return NextResponse.json({ success: false, message: 'No backups found' }, { status: 404 });
    }

    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const latestBackup = fileInfos[0];

    const fileBuffer = await fs.readFile(latestBackup.path);
    const base64Data = fileBuffer.toString('base64');

    return NextResponse.json({
      Data: base64Data,
      FileName: latestBackup.name,
      Date: latestBackup.mtime.toISOString()
    });
  } catch (error) {
    console.error('Get latest backup error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
