import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

const VERSIONS_DIR = path.join(process.cwd(), 'uploads', 'versions');
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`upload-version:${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, message: `Too many requests. Retry after ${rateCheck.retryAfter}s` }, { status: 429 });
    }

    const formData = await request.formData();
    const version = formData.get('version') as string;
    const releaseNotes = formData.get('releaseNotes') as string;
    const isForced = formData.get('isForced') === 'on';
    const file = formData.get('file') as File;

    if (!version || !releaseNotes || !file) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.exe')) {
      return NextResponse.json(
        { success: false, message: 'Only .exe files allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File too large (max 200MB)' },
        { status: 413 }
      );
    }

    // Validate MZ signature (exe file header)
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 2 || buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
      return NextResponse.json(
        { success: false, message: 'Invalid file: not a valid .exe' },
        { status: 400 }
      );
    }

    await fs.mkdir(VERSIONS_DIR, { recursive: true });

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = `NexoPOS_v${version}.exe`;
    const filePath = path.join(VERSIONS_DIR, fileName);
    const downloadUrl = `/api/v1/update/download/${version}`;

    await fs.writeFile(filePath, buffer);

    await prisma.version.create({
      data: {
        version,
        downloadUrl,
        checksum,
        releaseNotes,
        isForced
      }
    });

    return NextResponse.json({ success: true, message: 'تم رفع الإصدار بنجاح' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'رقم الإصدار موجود بالفعل' },
        { status: 409 }
      );
    }
    
    console.error('Upload version error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const versions = await prisma.version.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Get versions error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
