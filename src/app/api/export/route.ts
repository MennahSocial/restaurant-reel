import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { r2 } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId parameter' }, { status: 400 });
    }

    const asset = await prisma.reelAsset.findFirst({
      where: {
        id: assetId,
        project: {
          user: {
            email: session.user.email
          }
        }
      },
      include: {
        project: true
      }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: asset.url,
    });

    const response = await r2.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const filename = asset.url.split('/').pop() || 'video.mp4';
    const contentType = response.ContentType || 'video/mp4';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export video' },
      { status: 500 }
    );
  }
}
