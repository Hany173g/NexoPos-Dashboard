import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentVersion = searchParams.get('currentVersion');
    const licenseKey = request.headers.get('x-license-key');

    if (!currentVersion || !licenseKey) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    const latestVersion = await prisma.version.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!latestVersion) {
      return NextResponse.json({ hasUpdate: false });
    }

    // Compare versions (simple semver comparison)
    const hasUpdate = compareVersions(latestVersion.version, currentVersion) > 0;

    if (!hasUpdate) {
      return NextResponse.json({ hasUpdate: false });
    }

    return NextResponse.json({
      hasUpdate: true,
      version: latestVersion.version,
      downloadUrl: latestVersion.downloadUrl,
      checksum: latestVersion.checksum,
      releaseNotes: latestVersion.releaseNotes,
      isForced: latestVersion.isForced
    });
  } catch (error) {
    console.error('Check update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  
  return 0;
}
