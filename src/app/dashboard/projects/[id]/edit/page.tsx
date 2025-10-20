import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AssetType } from '@prisma/client';
import VideoEditor from '@/components/VideoEditor';

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>; // CHANGED: Added Promise
}) {
  // ADDED: Await params (Next.js 15 requirement)
  const { id } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.reelUser.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  const project = await prisma.reelProject.findUnique({
    where: {
      id: id, // CHANGED: Use awaited id
      userId: user.id,
    },
  });

  if (!project) {
    redirect('/dashboard');
  }

  const assets = await prisma.reelAsset.findMany({
    where: {
      projectId: project.id,
      type: AssetType.video,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  });

  if (!assets || assets.length === 0) {
    redirect(`/dashboard/projects/${id}`);
  }

  const asset = assets[0];

  const videoUrl = `/api/video-proxy?key=${encodeURIComponent(asset.url)}`;

  return (
    <VideoEditor
      project={{
        id: project.id,
        name: project.name,
      }}
      videoUrl={videoUrl}
      assetId={asset.id}
    />
  );
}
