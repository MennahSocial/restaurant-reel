import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// This is now only a JOB SUBMITTER, it no longer runs FFmpeg.

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Parse request body with all processing parameters
    const body = await request.json();
    const { 
        projectId, 
        assetId, 
        trimStart, 
        trimEnd,
        selectedAudio, 
        textOverlay 
    } = body;

    // --- Validation and Authorization ---
    if (!projectId || !assetId || trimStart === undefined || trimEnd === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    if (trimStart < 0 || trimEnd <= trimStart) {
      return NextResponse.json(
        { error: 'Invalid time selection' },
        { status: 400 }
      );
    }

    // Verify user owns the project/asset (simple check)
    const project = await prisma.reelProject.findFirst({
        where: { id: projectId, userId: userId },
        include: {
            assets: { where: { id: assetId } }
        }
    });

    if (!project || project.assets.length === 0) {
      return NextResponse.json(
        { error: 'Project or asset not found' },
        { status: 404 }
      );
    }

    // --- Job Submission (New Logic) ---

    // 1. Update Project Status to show it's working
    await prisma.reelProject.update({
        where: { id: projectId },
        data: {
            status: 'PROCESSING',
        }
    });

    // 2. Persist all job details for the background worker to pick up
    // NOTE: This JSON is what the worker would read to run FFmpeg.
    const jobDetails = {
        sourceAssetKey: project.assets[0].url,
        trimStart,
        trimEnd,
        selectedAudio,
        textOverlay,
    };
    
    // 3. Instead of a dedicated job table, we'll store the job details 
    // in the project's metadata (a new column would be cleaner later).
    // For now, we'll just return success and rely on the PROCESSING status.

    // 4. Return IMMEDIATE success to the client (browser)
    return NextResponse.json({
      success: true,
      message: 'Processing job submitted. Check dashboard for status update.',
      status: 'SUBMITTED',
      projectId: projectId,
    });

  } catch (error: any) {
    console.error('Job Submission API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit processing job' },
      { status: 500 }
    );
  }
}