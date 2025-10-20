import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AssetType } from '@prisma/client';
import VideoEditor from '@/components/VideoEditor';

// Define the expected Brand Kit structure
interface BrandKitData {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

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

  // Get user to fetch brand kit and project
  const user = await prisma.reelUser.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch the brand kit settings
  const userBrandKit = await prisma.reelBrandKit.findUnique({
    where: { userId: user.id },
    select: {
      primaryColor: true,
      secondaryColor: true,
      fontFamily: true,
    }
  });

  // Define fallback/default values
  const defaultKit: BrandKitData = {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
  };

  // Combine fetched data with defaults
  const brandKitProps: BrandKitData = {
    ...defaultKit,
    ...(userBrandKit || {}),
  };

  const project = await prisma.reelProject.findUnique({
    where: {
      id: id,
      userId: user.id,
    },
  });

  if (!project) {
    redirect('/dashboard');
  }

  const assets = await prisma.reelAsset.findMany({
    where: {
      projectId: project.id,
      // Correctly look for editable video assets (Raw or Trimmed/Processed)
      type: {
        in: [AssetType.RAW_VIDEO, AssetType.TRIMMED_VIDEO],
      },
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
      brandKit={brandKitProps} // <-- PASSES REAL DATA TO CLIENT
    />
  );
}