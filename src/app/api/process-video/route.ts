import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { r2 } from '@/lib/r2';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  trimVideo,
  checkFFmpegInstalled,
  createTempDir,
  cleanupTempFiles,
  generateTrimmedFilename,
  TextOverlayOptions,
} from '@/lib/ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { ReelProject, ReelAsset } from '@prisma/client';

// Mock audio data lookup (as used in the editor component)
const MOCK_AUDIO_ASSETS: { [key: string]: { key: string, name: string } } = {
  'track-1': { key: 'audio/jazz-lounge.mp3', name: 'Jazz Lounge' },
  'track-2': { key: 'audio/upbeat-funk.mp3', name: 'Upbeat Funk' },
  'track-3': { key: 'audio/calm-acoustic.mp3', name: 'Calm Acoustic' },
};

// Mock function for Audio Download (simulating R2 download)
async function getAudioInputPath(tempDir: string, selectedAudioKey: string): Promise<string> {
    const audioAsset = MOCK_AUDIO_ASSETS[selectedAudioKey];
    if (!audioAsset) throw new Error(`Audio asset not found for key: ${selectedAudioKey}`);

    // This section needs to be replaced with your actual R2 logic 
    // to download the audio file associated with the selected key.
    console.warn(`[MOCK] In production, R2 asset ${audioAsset.key} would be downloaded here.`);
    
    // For now, we simulate a file path. FFmpeg will likely fail if no real file is present.
    const audioInputPath = path.join(tempDir, 'mock-audio.mp3');
    // We create a dummy file to prevent a file not found error in FFmpeg, 
    // but the final mix won't have the correct audio unless you upload a mock MP3.
    await fs.writeFile(audioInputPath, 'MOCK DUMMY DATA'); 
    return audioInputPath; 
}


export async function POST(request: NextRequest) {
  let tempDir: string | null = null;
  let jobProject: (ReelProject & { assets: ReelAsset[] }) | null = null;
  let errorToReport: string | undefined;

  // Security check: only allow this worker to be called internally in production
  if (process.env.NODE_ENV === 'production' && request.headers.get('X-Worker-Secret') !== process.env.WORKER_SECRET) {
     return NextResponse.json({ error: 'Unauthorized Worker Access' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { projectId } = body;
    
    if (!projectId) {
        throw new Error('Missing projectId in worker payload.');
    }

    // 1. Fetch Job and Project Data
    jobProject = await prisma.reelProject.findUnique({
        where: { id: projectId },
        include: { assets: true }
    });

    if (!jobProject || !jobProject.jobDetails) {
        throw new Error(`Project ${projectId} not found or job details missing.`);
    }
    
    const jobData = jobProject.jobDetails as any;
    const sourceAsset = jobProject.assets.find(a => a.id === jobData.sourceAssetId);

    if (!sourceAsset) {
        throw new Error(`Source asset ${jobData.sourceAssetId} not found.`);
    }

    // --- Setup FFmpeg Environment ---
    const ffmpegInstalled = await checkFFmpegInstalled();
    if (!ffmpegInstalled) {
        throw new Error('FFmpeg is not installed on the server');
    }

    tempDir = await createTempDir();
    const inputPath = path.join(tempDir, 'input' + path.extname(sourceAsset.url));
    const outputPath = path.join(tempDir, 'output.mp4'); 

    // --- 2. Video Download ---
    console.log(`Worker: Downloading source video ${sourceAsset.url} from R2...`);
    const getCommand = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: jobData.sourceAssetKey,
    });

    const r2Response = await r2.send(getCommand);
    if (!r2Response.Body) {
        throw new Error('Failed to download video from R2');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of r2Response.Body as any) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    await fs.writeFile(inputPath, buffer);
    // ----------------------

    // --- 3. Audio Download Logic ---
    let audioInputPath: string | undefined;
    if (jobData.selectedAudio) {
        audioInputPath = await getAudioInputPath(tempDir, jobData.selectedAudio);
    }

    // --- 4. FFmpeg Processing Call ---
    console.log(`Worker: Running FFmpeg processing for project ${projectId}...`);
    await trimVideo({
        inputPath,
        outputPath,
        startTime: jobData.trimStart,
        endTime: jobData.trimEnd,
        audioInputPath,
        textOverlay: jobData.textOverlay as TextOverlayOptions,
        fastMode: false, 
    });
    // ------------------------------------

    // --- 5. Upload Result ---
    const processedBuffer = await fs.readFile(outputPath);

    const originalFilename = path.basename(sourceAsset.url);
    const trimmedFilename = generateTrimmedFilename(originalFilename);
    const processedKey = `exports/${jobProject.user.email}/${trimmedFilename}`;

    console.log('Worker: Uploading processed video to R2...');
    const putCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: processedKey,
        Body: processedBuffer,
        ContentType: 'video/mp4',
    });

    await r2.send(putCommand);

    // --- 6. Update Database Status ---
    const newAsset = await prisma.reelAsset.create({
        data: {
            url: processedKey,
            type: 'FINAL_EXPORT', 
            projectId: projectId,
        },
    });

    await prisma.reelProject.update({
        where: { id: projectId },
        data: {
            status: 'COMPLETED',
        },
    });
    
    // --- 7. Cleanup and Response ---
    await cleanupTempFiles(tempDir);
    tempDir = null;

    return NextResponse.json({
        success: true,
        assetId: newAsset.id,
    });

  } catch (error: any) {
    errorToReport = error.message || 'Unknown processing failure';
    console.error(`Worker failed for Project ${jobProject?.id || body?.projectId}:`, error);

    // CRITICAL: Update project status to FAILED on error
    if (jobProject?.id) {
        await prisma.reelProject.update({
            where: { id: jobProject.id },
            data: { status: 'FAILED' }
        }).catch(e => console.error("Failed to update project status to FAILED:", e));
    }

    if (tempDir) {
      await cleanupTempFiles(tempDir);
    }

    return NextResponse.json(
      { error: errorToReport },
      { status: 500 }
    );
  }
}