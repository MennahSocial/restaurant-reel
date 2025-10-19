'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Scissors, Type, Download } from 'lucide-react';

interface VideoEditorProps {
  project: {
    id: string;
    name: string;
  };
  videoUrl: string;
}

export default function VideoEditor({ project, videoUrl }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

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

    // Check if metadata is already loaded (fixes race condition)
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
  }, [trimEnd]);

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

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header - Fixed height */}
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
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Main Content - Flexible */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Video Preview */}
        <div className="flex-1 flex flex-col bg-black p-4 lg:p-8 min-h-0 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto">
            {/* Video Player */}
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
            
            {/* Controls */}
            <div className="mt-6 space-y-4">
              {/* Timeline */}
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

              {/* Playback Controls */}
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

        {/* Sidebar Tools */}
        <div className="w-full lg:w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4">Tools</h2>
          
          <div className="space-y-4">
            {/* Trim Tool */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Scissors className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-white">Trim Video</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Start Time (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimStart.toFixed(1)}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">End Time (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimEnd.toFixed(1)}
                    onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <p className="text-xs text-gray-300">
                    <span className="font-medium">Trimmed Duration:</span> {formatTime(trimEnd - trimStart)}
                  </p>
                </div>
              </div>
            </div>

            {/* Text Overlay (Coming Soon) */}
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
