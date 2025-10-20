// --- START COPY PASTE for src/app/api/trim/route.ts ---
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// This is the JOB SUBMITTER endpoint.

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
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

    const sourceAsset = project.assets[0];

    // --- Job Submission Logic ---

    // 1. Persist ALL job details (source, trim, layers) in the jobDetails column
    const jobDetails = {
        sourceAssetId: sourceAsset.id,
        sourceAssetKey: sourceAsset.url,
        trimStart,
        trimEnd,
        selectedAudio,
        textOverlay,
    };
    
    await prisma.reelProject.update({
        where: { id: projectId },
        data: {
            status: 'PROCESSING', // Set project status to block further edits
            jobDetails: jobDetails, // Save all instructions for the worker
        }
    });

    // 2. Immediately trigger the background worker via a NON-BLOCKING request.
    // We use `fetch` and intentionally do NOT use `await` here.
    const workerSecret = process.env.WORKER_SECRET || 'dev-secret';
    
    fetch(`${request.nextUrl.origin}/api/process-video`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // CRITICAL: This is the security key the worker checks
            'X-Worker-Secret': workerSecret, 
        },
        // The worker only needs the projectId to fetch the saved jobDetails
        body: JSON.stringify({ projectId }), 
    }).catch(err => {
        console.error("Non-blocking worker launch failed:", err);
    });

    // 3. Return IMMEDIATE success (200 OK) to the client
    return NextResponse.json({
      success: true,
      message: 'Processing job submitted.',
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