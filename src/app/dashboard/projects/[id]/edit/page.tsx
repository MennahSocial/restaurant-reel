import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AssetType } from '@prisma/client';
import VideoEditor from '@/components/VideoEditor';

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      id: id,
      userId: user.id,
    },
  });

  if (!project) {
    redirect('/dashboard');
  }

  // Get the latest RAW_VIDEO asset for this project
  const assets = await prisma.reelAsset.findMany({
    where: {
      projectId: project.id,
      type: AssetType.RAW_VIDEO,
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
  const videoUrl = `https://pub-437a859a90fc40a187a8684078f14b90.r2.dev/${asset.url}`;

  console.log('Asset found:', asset);
  console.log('Video URL:', videoUrl);

  if (!videoUrl) {
    throw new Error('Video URL is missing');
  }

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
