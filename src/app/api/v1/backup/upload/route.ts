import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

const BACKUPS_DIR = path.join(process.cwd(), 'uploads', 'backups');
const MAX_BACKUP_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

export async function POST(request: Request) {
  try {
    console.log('=== BACKUP UPLOAD STARTED ===');
    console.log('BACKUPS_DIR:', BACKUPS_DIR);
    console.log('process.cwd():', process.cwd());
    
    // Get headers
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    
    const rawBody = await request.text();
    console.log('Raw body length:', rawBody?.length);
    console.log('Raw body (first 200 chars):', rawBody?.substring(0, 200));
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.log('Failed to parse JSON, error:', e.message);
      body = {};
    }
    
    console.log('Parsed body:', JSON.stringify(body, null, 2));
    console.log('Body keys:', Object.keys(body));
    
    // Support both PascalCase (C#) and camelCase (JS)
    const licenseKey = body.licenseKey || body.LicenseKey;
    const fileName = body.fileName || body.FileName;
    const data = body.data || body.Data;
    const deviceInfo = body.deviceInfo || body.DeviceInfo;
    
    console.log('licenseKey:', licenseKey);
    console.log('fileName:', fileName);
    console.log('data length:', data?.length);
    console.log('deviceInfo:', deviceInfo);

    if (!licenseKey || !fileName || !data) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Check backup size
    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > MAX_BACKUP_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: 'Backup too large (max 250MB)' },
        { status: 413 } // Payload Too Large
      );
    }

    // Create directory structure
    const licenseBackupsDir = path.join(BACKUPS_DIR, licenseKey);
    console.log('Creating directory:', licenseBackupsDir);
    await fs.mkdir(licenseBackupsDir, { recursive: true });
    console.log('Directory created/exists');

    // Check if there's already a backup today
    const todayDate = new Date().toISOString().split('T')[0];
    const files = await fs.readdir(licenseBackupsDir);
    const hasBackupToday = files.some(file => {
      // Filename format: backup_YYYY-MM-DD_HH-mm.db
      return file.startsWith(`backup_${todayDate}`);
    });

    if (hasBackupToday) {
      return NextResponse.json(
        { success: false, message: 'Backup already exists for today' },
        { status: 409 } // Conflict
      );
    }

    // Save the backup
    const filePath = path.join(licenseBackupsDir, fileName);
    console.log('Saving file to:', filePath);
    await fs.writeFile(filePath, buffer);
    console.log('File saved successfully');
    
    // Verify file exists
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    console.log('File exists after save:', fileExists);

    // Read ALL files again (including the new one!)
    const allFiles = await fs.readdir(licenseBackupsDir);
    // Keep only last 5 backups
    const fileInfoPromises = allFiles.map(async (file) => {
      const fullPath = path.join(licenseBackupsDir, file);
      const stat = await fs.stat(fullPath);
      return { name: file, path: fullPath, mtime: stat.mtime };
    });

    const fileInfos = await Promise.all(fileInfoPromises);
    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Newest first

    if (fileInfos.length > 5) {
      const filesToDelete = fileInfos.slice(5);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم حفظ النسخة الاحتياطية'
    });
  } catch (error) {
    console.error('Backup upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
