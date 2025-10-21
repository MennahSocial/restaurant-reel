import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions as any) as any;
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, videoKeys } = await request.json();

  // Find user
  const user = await prisma.reelUser.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Create project with assets
  const project = await prisma.reelProject.create({
    data: {
      name,
      userId: user.id,
      status: 'PENDING',
      assets: {
        create: videoKeys.map((key: string) => ({
          type: 'RAW_VIDEO',
          url: key,
        }))
      }
    },
    include: {
      assets: true
    }
  });

  return NextResponse.json(project);
}
