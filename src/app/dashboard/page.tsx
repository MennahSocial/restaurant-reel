import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PlusCircle, Video, Clock, FolderOpen } from 'lucide-react';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const projects = await prisma.reelProject.findMany({
    where: {
      user: {
        email: session.user.email
      }
    },
    include: {
      assets: true,
      user: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const totalVideos = projects.reduce((sum, p) => sum + p.assets.length, 0);
  const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{projects.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Videos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalVideos}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Video className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{completedProjects}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
          <p className="text-gray-600 mt-1">Create and manage your video reels</p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first video reel</p>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Reel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:scale-105"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {project.name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  project.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Video className="w-4 h-4 mr-1" />
                {project.assets.length} video{project.assets.length !== 1 ? 's' : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
