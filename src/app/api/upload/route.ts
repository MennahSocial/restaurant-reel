import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { r2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique key
    const key = `uploads/${session.user.email}/${randomUUID()}-${file.name}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to R2
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'restaurant-reel-videos',
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    return NextResponse.json({ key, filename: file.name });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
