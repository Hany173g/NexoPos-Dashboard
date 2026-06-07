import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const licenseId = parseInt(params.id);
    
    // First, get the current license to check expiry date
    const existingLicense = await prisma.license.findUnique({
      where: { id: licenseId }
    });

    if (!existingLicense) {
      return NextResponse.json(
        { success: false, message: 'License not found' },
        { status: 404 }
      );
    }

    // Calculate new expiry date:
    // If already expired, add 30 days to now
    // If still active, add 30 days to existing expiry date
    let newExpiryDate: Date;
    const now = new Date();
    
    if (existingLicense.expiryDate) {
      const currentExpiry = new Date(existingLicense.expiryDate);
      
      if (currentExpiry > now) {
        // License is still active: add 30 days to current expiry
        newExpiryDate = new Date(currentExpiry);
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);
      } else {
        // License expired: add 30 days to now
        newExpiryDate = new Date(now);
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);
      }
    } else {
      // No expiry date set: add 30 days to now
      newExpiryDate = new Date(now);
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    }

    // Update the license
    const updatedLicense = await prisma.license.update({
      where: { id: licenseId },
      data: {
        expiryDate: newExpiryDate,
        status: 'active', // Ensure status is active when extending
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم توسيع الترخيص بنجاح',
      license: updatedLicense
    });
  } catch (error) {
    console.error('Error extending license:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
