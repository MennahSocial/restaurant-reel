'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoUpload from '@/components/VideoUpload';
import axios from 'axios';
import { ArrowLeft, Video } from 'lucide-react';
import Link from 'next/link';

export default function NewProject() {
  const [projectName, setProjectName] = useState('');
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleUploadComplete = (key: string) => {
    setUploadedKeys(prev => [...prev, key]);
  };

  const handleCreateProject = async () => {
    if (!projectName || uploadedKeys.length === 0) {
      alert('Please provide a project name and upload at least one video');
      return;
    }

    setCreating(true);
    try {
      const { data } = await axios.post('/api/projects', {
        name: projectName,
        videoKeys: uploadedKeys,
      });

      router.push(`/dashboard`);
      router.refresh();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-1">Upload your videos and let's create something amazing</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Summer Menu Launch, Behind the Scenes"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Videos ({uploadedKeys.length})
          </label>
          <VideoUpload onUploadComplete={handleUploadComplete} />
        </div>

        {uploadedKeys.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                ✓ {uploadedKeys.length} video{uploadedKeys.length !== 1 ? 's' : ''} uploaded successfully
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleCreateProject}
          disabled={!projectName || uploadedKeys.length === 0 || creating}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating Project...' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
