'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Scissors, Type, Download, Loader2, CheckCircle, Music } from 'lucide-react';
import axios from 'axios';

// NEW INTERFACE for the Brand Kit prop
interface BrandKitData {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

interface VideoEditorProps {
  project: {
    id: string;
    name: string;
  };
  videoUrl: string;
  assetId: string;
  brandKit: BrandKitData; // <-- ACCEPTS REAL PROP
}

type TrimStatus = 'idle' | 'processing' | 'success' | 'error';

// STATIC DATA: Simulated list of licensed music tracks
const MOCK_AUDIO_TRACKS = [
  { id: 'track-1', name: 'Jazz Lounge (30s)' },
  { id: 'track-2', name: 'Upbeat Funk (60s)' },
  { id: 'track-3', name: 'Calm Acoustic (45s)' },
];


export default function VideoEditor({ project, videoUrl, assetId, brandKit }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trimEndRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [selectedAudio, setSelectedAudio] = useState<string | null>(null); 
  
  // Text Overlay State uses actual brandKit colors for defaults
  const [textOverlay, setTextOverlay] = useState({
    content: '',
    position: 'bottom' as 'top' | 'center' | 'bottom',
    isVisible: false,
    color: brandKit.primaryColor, // Use real primary color
    font: brandKit.fontFamily      // Use real font
  });
  
  const [trimStatus, setTrimStatus] = useState<TrimStatus>('idle');
  const [trimmedAssetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Synchronize ref with trimEnd state whenever it changes
  useEffect(() => {
    trimEndRef.current = trimEnd;
  }, [trimEnd]);


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const videoDuration = video.duration || 0;
      setDuration(videoDuration);
      setTrimEnd(videoDuration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (video.currentTime >= trimEndRef.current) {
        video.pause();
      }
    };

    if (video.readyState >= 1) {
      const videoDuration = video.duration || 0;
      setDuration(videoDuration);
      setTrimEnd(videoDuration);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay); 
    video.addEventListener('pause', handlePause);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []); 

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
  
    if (video.paused) {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play().catch(err => {
        console.error('Video play failed:', err);
      });
    } else {
      video.pause();
    }
  };
  

  const handleReset = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = trimStart;
    setCurrentTime(trimStart);
    video.pause();
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
      if (trimEnd <= trimStart) {
        throw new Error('End time must be greater than start time.');
      }

      // 1. Prepare Text Overlay Data for the API payload
      const processingTextOverlay = textOverlay.isVisible && textOverlay.content.trim() !== '' ? {
        content: textOverlay.content.trim(),
        color: textOverlay.color,
        position: textOverlay.position,
        // Passing the font allows the server (ffmpeg) to find the right font
        font: textOverlay.font, 
      } : undefined;


      const response = await axios.post('/api/trim', {
          projectId: project.id,
          assetId: assetId,
          trimStart: trimStart,
          trimEnd: trimEnd,
          selectedAudio: selectedAudio, // Passed to server
          textOverlay: processingTextOverlay, // Passed to server
      });

      // NEW LOGIC: The API now returns SUBMITTED status instantly
      if (response.data.status === 'SUBMITTED') {
        // We leave status as 'processing' and rely on the dashboard 
        // polling or the user checking back later for 'COMPLETED'.
        console.warn("Job submitted:", response.data.message);
      } else {
        // Fallback for unexpected success
        setTrimStatus('success');
        setTimeout(() => setTrimStatus('idle'), 3000);
      }

    } catch (error: any) {
      console.error('Trim error:', error);
      setTrimStatus('error');
      setErrorMessage(error.response?.data?.error || error.message || 'Failed to submit processing job');
    }
  };

  const handleExport = () => {
    if (trimmedAssetId) {
      window.open(`/api/export?assetId=${trimmedAssetId}`, '_blank');
    } else {
      window.open(videoUrl, '_blank');
    }
  };

  // Helper function to get Tailwind class for text position
  const getTextPositionClass = (position: string) => {
    switch (position) {
      case 'top': return 'top-8';
      case 'center': return 'top-1/2 -translate-y-1/2';
      case 'bottom': default: return 'bottom-8';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
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
          // Use real primary color for styling
          className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{ backgroundColor: brandKit.primaryColor }}
          disabled={trimStatus === 'processing'}
        >
          <Download className="w-4 h-4" />
          <span>Export Final Reel</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col bg-black p-4 lg:p-8 min-h-0 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-black rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[60vh] object-contain"
                playsInline
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>

              {/* Text Overlay Preview */}
              {textOverlay.isVisible && (
                <div 
                  className={`absolute left-0 right-0 p-4 text-center pointer-events-none ${getTextPositionClass(textOverlay.position)}`}
                  style={{ fontFamily: textOverlay.font }}
                >
                  <p 
                    className={`text-4xl font-black uppercase tracking-wide px-4 py-2 bg-black/50 inline-block`}
                    // Use real brand colors for text and simulated outline
                    style={{ color: textOverlay.color, WebkitTextStroke: `1px ${brandKit.secondaryColor}` }}
                  >
                    {textOverlay.content}
                  </p>
                </div>
              )}
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
                    // Use real primary color for the timeline progress indicator
                    background: `linear-gradient(to right, ${brandKit.primaryColor} 0%, ${brandKit.primaryColor} ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
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
                  className={`p-4 text-white rounded-full transition-colors`}
                  // Use real primary color for the Play button
                  style={{ backgroundColor: isPlaying ? '#374151' : brandKit.primaryColor }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4">Tools</h2>
          
          <div className="space-y-4">
            {/* Trim Tool */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Scissors className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-white">Trim Video</h3>
              </div>
              <div className="space-y-3">
                {/* ... Trim controls remain here ... */}
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

            {/* Audio Selection Tool */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Music className="w-5 h-5 text-green-400" />
                <h3 className="font-medium text-white">Add Music Track</h3>
              </div>
              
              <select
                value={selectedAudio || 'none'}
                onChange={(e) => setSelectedAudio(e.target.value === 'none' ? null : e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-green-500 focus:outline-none text-sm"
              >
                <option value="none">No Background Music</option>
                {MOCK_AUDIO_TRACKS.map(track => (
                  <option key={track.id} value={track.id}>{track.name}</option>
                ))}
              </select>

              {selectedAudio && (
                <p className="text-xs text-green-300 mt-2">
                  Selected: {MOCK_AUDIO_TRACKS.find(t => t.id === selectedAudio)?.name}
                </p>
              )}
            </div>


            {/* Branded Text Overlay */}
            <div 
              className="rounded-lg p-4 bg-gray-700 border"
              // Use real primary color for the border
              style={{ borderColor: brandKit.primaryColor, borderWidth: 1 }}
            >
              <div className="flex items-center space-x-2 mb-3">
                <Type className="w-5 h-5" style={{ color: brandKit.primaryColor }} />
                <h3 className="font-medium text-white">Add Text Overlay</h3>
              </div>
              <div className="space-y-3">
                {/* Text Input */}
                <div>
                  <label htmlFor="text-content" className="text-sm text-gray-400 block mb-1">Text Content</label>
                  <input
                    id="text-content"
                    type="text"
                    value={textOverlay.content}
                    // Toggle visibility based on content
                    onChange={(e) => setTextOverlay(p => ({ 
                      ...p, 
                      content: e.target.value, 
                      isVisible: e.target.value.length > 0 
                    }))}
                    placeholder="E.g., Try Our New Special!"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-red-500 focus:outline-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: brandKit.fontFamily }}>
                    Font: **{brandKit.fontFamily}** | Color: **{brandKit.primaryColor}**
                  </p>
                </div>
                
                {/* Position Select */}
                <div>
                  <label htmlFor="text-position" className="text-sm text-gray-400 block mb-1">Position</label>
                  <select
                    id="text-position"
                    value={textOverlay.position}
                    onChange={(e) => setTextOverlay(p => ({ ...p, position: e.target.value as 'top' | 'center' | 'bottom' }))}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-red-500 focus:outline-none text-sm"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}