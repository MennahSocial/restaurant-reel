import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { r2 } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the video key from query params
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing video key' }, { status: 400 });
    }

    // Verify the user has access to this asset
    const asset = await prisma.reelAsset.findFirst({
      where: {
        url: key,
        project: {
          user: {
            email: session.user.email
          }
        }
      }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 404 });
    }

    // Get the Range header from the request
    const range = request.headers.get('range');

    // Fetch the object from R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Range: range || undefined, // Pass the range header to R2 if present
    });

    const response = await r2.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);

    // Determine the content type
    const contentType = response.ContentType || 'video/mp4';
    const contentLength = response.ContentLength || buffer.length;

    // If Range header was present, return 206 Partial Content
    if (range && response.ContentRange) {
      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Content-Range': response.ContentRange,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Otherwise return the full video with 200 OK
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    );
  }
}
