'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Scissors, Type, Download, Loader2, CheckCircle } from 'lucide-react';

interface VideoEditorProps {
  project: {
    id: string;
    name: string;
  };
  videoUrl: string;
  assetId: string;
}

type TrimStatus = 'idle' | 'processing' | 'success' | 'error';

export default function VideoEditor({ project, videoUrl, assetId }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  const [trimStatus, setTrimStatus] = useState<TrimStatus>('idle');
  const [trimmedAssetId, setTrimmedAssetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (video.currentTime >= trimEnd) {
        video.pause();
        setIsPlaying(false);
      }
    };

    if (video.readyState >= 1) {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = trimStart;
    setCurrentTime(trimStart);
    video.pause();
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleTrim = async () => {
    if (trimStatus === 'processing') return;

    setTrimStatus('processing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/trim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          assetId: assetId,
          trimStart: trimStart,
          trimEnd: trimEnd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trim video');
      }

      setTrimStatus('success');
      setTrimmedAssetId(data.asset.id);

      setTimeout(() => {
        setTrimStatus('idle');
      }, 3000);

    } catch (error: any) {
      console.error('Trim error:', error);
      setTrimStatus('error');
      setErrorMessage(error.message || 'Failed to trim video');
    }
  };

  const handleExport = () => {
    if (trimmedAssetId) {
      window.open(`/api/export?assetId=${trimmedAssetId}`, '_blank');
    } else {
      window.open(videoUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            <p className="text-sm text-gray-400">Video Editor</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={trimStatus === 'processing'}
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col bg-black p-4 lg:p-8 min-h-0 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[60vh] object-contain"
                onClick={togglePlayPause}
                playsInline
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4 pb-4">
                <button
                  onClick={handleReset}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                  title="Reset to start"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors text-white"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4">Tools</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Scissors className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-white">Trim Video</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label htmlFor="trim-start" className="text-sm text-gray-400 block mb-1">
                    Start Time: {trimStart.toFixed(1)}s
                  </label>
                  <input
                    id="trim-start"
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    disabled={trimStatus === 'processing'}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.0s</span>
                    <span>{duration.toFixed(1)}s</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="trim-end" className="text-sm text-gray-400 block mb-1">
                    End Time: {trimEnd.toFixed(1)}s
                  </label>
                  <input
                    id="trim-end"
                    type="range"
                    min={trimStart}
                    max={duration}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    disabled={trimStatus === 'processing'}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{trimStart.toFixed(1)}s</span>
                    <span>{duration.toFixed(1)}s</span>
                  </div>
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <p className="text-xs text-gray-300">
                    <span className="font-medium">Trimmed Duration:</span> {formatTime(Math.max(0, trimEnd - trimStart))}
                  </p>
                </div>

                <button
                  onClick={handleTrim}
                  disabled={trimStatus === 'processing'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trimStatus === 'processing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : trimStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Trimmed!</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      <span>Trim Video</span>
                    </>
                  )}
                </button>

                {trimStatus === 'success' && (
                  <div className="bg-green-900/50 border border-green-700 rounded p-3">
                    <p className="text-sm text-green-300">
                      ✓ Video trimmed successfully! Click Export to download.
                    </p>
                  </div>
                )}

                {trimStatus === 'error' && (
                  <div className="bg-red-900/50 border border-red-700 rounded p-3">
                    <p className="text-sm text-red-300">
                      ✗ {errorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 opacity-50">
              <div className="flex items-center space-x-2 mb-2">
                <Type className="w-5 h-5 text-gray-400" />
                <h3 className="font-medium text-white">Add Text</h3>
              </div>
              <p className="text-sm text-gray-400">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
