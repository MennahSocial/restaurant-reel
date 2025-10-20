import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { r2 } from '@/lib/r2';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  trimVideo,
  checkFFmpegInstalled,
  createTempDir,
  cleanupTempFiles,
  generateTrimmedFilename
} from '@/lib/ffmpeg';
import path from 'path';
import fs from 'fs/promises';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, assetId, trimStart, trimEnd } = body;

    if (!projectId || !assetId || trimStart === undefined || trimEnd === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (trimStart < 0 || trimEnd <= trimStart) {
      return NextResponse.json(
        { error: 'Invalid trim times' },
        { status: 400 }
      );
    }

    const ffmpegInstalled = await checkFFmpegInstalled();
    if (!ffmpegInstalled) {
      return NextResponse.json(
        { error: 'FFmpeg is not installed on the server' },
        { status: 500 }
      );
    }

    const project = await prisma.reelProject.findFirst({
      where: {
        id: projectId,
        user: {
          email: session.user.email
        }
      },
      include: {
        assets: {
          where: {
            id: assetId
          }
        }
      }
    });

    if (!project || project.assets.length === 0) {
      return NextResponse.json(
        { error: 'Project or asset not found' },
        { status: 404 }
      );
    }

    const sourceAsset = project.assets[0];

    tempDir = await createTempDir();
    const inputPath = path.join(tempDir, 'input' + path.extname(sourceAsset.url));
    const outputPath = path.join(tempDir, 'output' + path.extname(sourceAsset.url));

    console.log('Downloading source video from R2...');
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: sourceAsset.url,
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

    console.log(`Trimming video from ${trimStart}s to ${trimEnd}s...`);
    await trimVideo({
      inputPath,
      outputPath,
      startTime: trimStart,
      endTime: trimEnd,
      fastMode: true,
    });

    const trimmedBuffer = await fs.readFile(outputPath);

    const originalFilename = path.basename(sourceAsset.url);
    const trimmedFilename = generateTrimmedFilename(originalFilename);
    const trimmedKey = `trimmed/${session.user.email}/${trimmedFilename}`;

    console.log('Uploading trimmed video to R2...');
    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: trimmedKey,
      Body: trimmedBuffer,
      ContentType: r2Response.ContentType || 'video/mp4',
    });

    await r2.send(putCommand);

    const newAsset = await prisma.reelAsset.create({
      data: {
        url: trimmedKey,
        type: 'TRIMMED_VIDEO',
        projectId: projectId,
      },
    });

    await cleanupTempFiles(tempDir);
    tempDir = null;

    return NextResponse.json({
      success: true,
      asset: {
        id: newAsset.id,
        url: trimmedKey,
        type: newAsset.type,
        duration: trimEnd - trimStart,
      },
    });

  } catch (error: any) {
    console.error('Trim API error:', error);

    if (tempDir) {
      await cleanupTempFiles(tempDir);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to trim video' },
      { status: 500 }
    );
  }
}
