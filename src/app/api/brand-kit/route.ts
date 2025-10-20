import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user ID from session (guaranteed to exist if session exists)
  const userId = (session.user as any).id;

  try {
    const { primaryColor, secondaryColor, fontFamily } = await request.json();

    if (!primaryColor || !secondaryColor || !fontFamily) {
      return NextResponse.json(
        { error: 'Missing required brand kit fields' },
        { status: 400 }
      );
    }
    
    // Upsert: Try to update the existing record, otherwise create a new one.
    const brandKit = await prisma.reelBrandKit.upsert({
      where: { userId: userId },
      update: {
        primaryColor,
        secondaryColor,
        fontFamily,
        // logoUrl is typically handled by a separate file upload
      },
      create: {
        userId,
        primaryColor,
        secondaryColor,
        fontFamily,
      }
    });

    return NextResponse.json({ success: true, brandKit });
  } catch (error) {
    console.error('Brand Kit save error:', error);
    return NextResponse.json(
      { error: 'Failed to save brand kit settings' },
      { status: 500 }
    );
  }
}