import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2 } from '@/lib/r2';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get video key from query params
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing video key' }, { status: 400 });
    }

    // Get Range header for video streaming
    const range = request.headers.get('range');

    // Get video metadata first
    const headCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    const headResponse = await r2.send(headCommand);
    const contentLength = headResponse.ContentLength || 0;
    const contentType = headResponse.ContentType || 'video/mp4';

    // If no range header, return entire video
    if (!range) {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      });

      const response = await r2.send(command);
      const stream = response.Body as any;

      return new NextResponse(stream.transformToWebStream(), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
    const chunkSize = end - start + 1;

    // Get partial content
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });

    const response = await r2.send(command);
    const stream = response.Body as any;

    return new NextResponse(stream.transformToWebStream(), {
      status: 206, // Partial Content
      headers: {
        'Content-Type': contentType,
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to load video', details: error.message },
      { status: 500 }
    );
  }
}
