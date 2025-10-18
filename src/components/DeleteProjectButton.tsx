'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import axios from 'axios';

export default function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`/api/projects/${projectId}`);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      alert('Failed to delete project');
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {deleting ? 'Deleting...' : 'Delete Project'}
    </button>
  );
}
