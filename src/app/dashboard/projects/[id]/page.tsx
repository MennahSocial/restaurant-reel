import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPublicUrl } from '@/lib/r2';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, Calendar, Clock, Download, Edit } from 'lucide-react';
import DeleteProjectButton from '@/components/DeleteProjectButton';

export default async function ProjectPage({ 
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
      assets: true,
      user: true
    }
  });

  if (!project) {
    notFound();
  }

  const hasVideos = project.assets.some(a => a.type === 'RAW_VIDEO');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Updated {new Date(project.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            project.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
            project.status === 'FAILED' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status}
          </span>
          {hasVideos && (
            <Link
              href={`/dashboard/projects/${project.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Video
            </Link>
          )}
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Video className="w-5 h-5 mr-2" />
          Uploaded Videos ({project.assets.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {project.assets.map((asset) => {
            const videoUrl = getPublicUrl(asset.url);
            return (
              <div
                key={asset.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="aspect-video bg-black">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {asset.url.split('/').pop()?.split('-').slice(1).join('-') || 'Video'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {asset.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(asset.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={videoUrl}
                      download
                      className="ml-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download video"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
