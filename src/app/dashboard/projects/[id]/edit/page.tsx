import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import VideoEditor from '@/components/VideoEditor';

export default async function EditProjectPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const project = await prisma.reelProject.findFirst({
    where: {
      id: id,
      user: {
        email: session.user.email
      }
    },
    include: {
      assets: {
        where: {
          type: 'RAW_VIDEO'
        }
      }
    }
  });

  if (!project || project.assets.length === 0) {
    notFound();
  }

  // Use proxy URL instead of direct R2 URL
  const videoUrl = `/api/video?key=${encodeURIComponent(project.assets[0].url)}`;

  return (
    <div className="h-screen flex flex-col">
      <VideoEditor 
        project={{
          id: project.id,
          name: project.name,
        }}
        videoUrl={videoUrl}
      />
    </div>
  );
}
