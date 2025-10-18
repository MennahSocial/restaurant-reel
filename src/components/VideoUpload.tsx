'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, CheckCircle, XCircle } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete: (key: string) => void;
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percentCompleted);
        },
      });

      onUploadComplete(data.key);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    disabled: uploading,
    maxSize: 500 * 1024 * 1024, // 500MB max
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
        isDragActive ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-gray-400'
      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="space-y-4">
          <Upload className="w-12 h-12 mx-auto text-blue-500 animate-bounce" />
          <p className="text-lg font-medium">Uploading... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-md mx-auto">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <XCircle className="w-12 h-12 mx-auto text-red-500" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="w-12 h-12 mx-auto text-gray-400" />
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop video here' : 'Drag & drop video here'}
          </p>
          <p className="text-sm text-gray-500">or click to browse</p>
          <p className="text-xs text-gray-400">Supports MP4, MOV, AVI, WebM (max 500MB)</p>
        </div>
      )}
    </div>
  );
}
