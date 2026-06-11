import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

const BACKUPS_DIR = path.join(process.cwd(), 'uploads', 'backups');
const MAX_BACKUP_SIZE_BYTES = 250 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rawBody = await request.text();

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const licenseKey = body.licenseKey || body.LicenseKey;
    const fileName = body.fileName || body.FileName;
    const data = body.data || body.Data;

    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json({ success: false, message: 'Valid licenseKey required' }, { status: 400 });
    }
    if (!fileName || typeof fileName !== 'string' || fileName.includes('..')) {
      return NextResponse.json({ success: false, message: 'Invalid fileName' }, { status: 400 });
    }
    if (!data || typeof data !== 'string') {
      return NextResponse.json({ success: false, message: 'Valid data (base64) required' }, { status: 400 });
    }

    const rateCheck = checkRateLimit(`backup-upload:${licenseKey}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, message: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ success: false, message: 'License not found' }, { status: 404 });
    }

    if (license.status !== 'active') {
      return NextResponse.json({ success: false, message: 'License is not active' }, { status: 403 });
    }

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > MAX_BACKUP_SIZE_BYTES) {
      return NextResponse.json({ success: false, message: 'Backup too large (max 250MB)' }, { status: 413 });
    }

    const licenseBackupsDir = path.join(BACKUPS_DIR, licenseKey);
    await fs.mkdir(licenseBackupsDir, { recursive: true });

    const todayDate = new Date().toISOString().split('T')[0];
    const files = await fs.readdir(licenseBackupsDir);
    const hasBackupToday = files.some(file => file.startsWith(`backup_${todayDate}`));

    if (hasBackupToday) {
      return NextResponse.json({ success: false, message: 'Backup already exists for today' }, { status: 409 });
    }

    const filePath = path.join(licenseBackupsDir, fileName);
    await fs.writeFile(filePath, buffer);

    const allFiles = await fs.readdir(licenseBackupsDir);
    const fileInfoPromises = allFiles.map(async (file) => {
      const fullPath = path.join(licenseBackupsDir, file);
      const stat = await fs.stat(fullPath);
      return { name: file, path: fullPath, mtime: stat.mtime };
    });

    const fileInfos = await Promise.all(fileInfoPromises);
    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (fileInfos.length > 5) {
      for (const file of fileInfos.slice(5)) {
        await fs.unlink(file.path);
      }
    }

    return NextResponse.json({ success: true, message: 'تم حفظ النسخة الاحتياطية' });
  } catch (error) {
    console.error('Backup upload error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
