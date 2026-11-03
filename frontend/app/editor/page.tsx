"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Scissors,
  Play,
  Pause,
  Download,
  Loader2,
  CheckCircle2,
  VolumeX,
  RotateCw,
  Maximize2,
  Clock,
  Film,
  RotateCcw,
} from "lucide-react";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { MediaItem, Job } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatBytes, formatDuration, formatTimeSecToHHMMSS } from "@/lib/formatters";

function VideoEditorContent() {
  const searchParams = useSearchParams();
  const mediaIdParam = searchParams.get("mediaId");

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trim timestamps
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("00:00:05");

  // Editing options
  const [muteAudio, setMuteAudio] = useState(false);
  const [resolution, setResolution] = useState("original");
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState("original");
  const [framerate, setFramerate] = useState("original");
  const [outputFormat, setOutputFormat] = useState("mp4");

  const [isStarting, setIsStarting] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (mediaIdParam) {
      api.getMedia(mediaIdParam).then((m) => {
        setSelectedMedia(m);
        setDuration(m.duration);
        setEndTime(formatTimeSecToHHMMSS(Math.min(m.duration, 30)));
      }).catch(() => {});
    }
  }, [mediaIdParam]);

  const handleMediaLoaded = (m: MediaItem) => {
    setSelectedMedia(m);
    setDuration(m.duration);
    setStartTime("00:00:00");
    setEndTime(formatTimeSecToHHMMSS(Math.min(m.duration || 10, 30)));
    setActiveJob(null);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const setStartToCurrent = () => {
    setStartTime(formatTimeSecToHHMMSS(currentTime));
  };

  const setEndToCurrent = () => {
    setEndTime(formatTimeSecToHHMMSS(currentTime));
  };

  // Polling active job
  useEffect(() => {
    if (!activeJob || ["completed", "failed", "cancelled"].includes(activeJob.status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const j = await api.getJob(activeJob.id);
        setActiveJob(j);
        if (j.status === "completed") {
          toast.success(`Clip trimmed & exported: ${j.output_filename}`);
        } else if (j.status === "failed") {
          toast.error(j.error || "Trimming failed");
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, toast]);

  const handleStartTrim = async () => {
    if (!selectedMedia) return;

    setIsStarting(true);
    try {
      const res = await api.queueVideoTrim({
        media_id: selectedMedia.id,
        start_time: startTime,
        end_time: endTime,
        output_format: outputFormat,
        mute_audio: muteAudio,
        resolution: resolution === "original" ? undefined : resolution,
        rotation: rotation === 0 ? undefined : rotation,
        aspect_ratio: aspectRatio === "original" ? undefined : aspectRatio,
        framerate: framerate === "original" ? undefined : parseInt(framerate),
      });

      const initialJob = await api.getJob(res.job_id);
      setActiveJob(initialJob);
      toast.info("Video trimming job started in background");
    } catch (err: any) {
      toast.error(err.message || "Failed to start trimming");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Scissors className="w-6 h-6 text-violet-400" />
          Video Trimmer & Basic Editor
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Set start and end timestamps, strip audio, rotate, resize, and export frame-accurate video clips.
        </p>
      </div>

      {!selectedMedia ? (
        <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 shadow-xl">
          <UploadDropzone
            onFileUploaded={handleMediaLoaded}
            acceptType="video"
            title="Upload a video to start trimming"
            subtitle="Drag & drop MP4, WebM, MOV, MKV files up to 2GB"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video Player and Timeline (2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Player Container */}
            <div className="rounded-3xl bg-black border border-[#21263c] overflow-hidden shadow-2xl relative flex flex-col items-center">
              <video
                ref={videoRef}
                src={api.getStreamUrl(selectedMedia.id)}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full max-h-[50vh] object-contain"
              />

              {/* Player Overlay Controls */}
              <div className="w-full bg-[#0d0f1a]/95 border-t border-[#1e2338] p-3 flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.05"
                    value={currentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setCurrentTime(t);
                      if (videoRef.current) videoRef.current.currentTime = t;
                    }}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#20253b] rounded-lg"
                  />
                </div>

                <div className="font-mono text-slate-300 shrink-0">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </div>
              </div>
            </div>

            {/* Timeline Trim Markers */}
            <div className="p-5 rounded-2xl bg-[#111422] border border-[#21263c] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Clip Selection Timestamps
                </span>
                <span className="text-xs font-mono text-indigo-400">
                  Format: HH:MM:SS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Time Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Trim Start</span>
                    <button
                      onClick={setStartToCurrent}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      Set to current position
                    </button>
                  </div>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="00:00:00"
                    className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* End Time Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Trim End</span>
                    <button
                      onClick={setEndToCurrent}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      Set to current position
                    </button>
                  </div>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="00:00:10"
                    className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Export & Editing Controls (1 col) */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-[#111422] border border-[#21263c] space-y-4 shadow-xl">
              <h3 className="font-bold text-white text-base border-b border-[#1e2338] pb-3">
                Editing Options
              </h3>

              {/* Mute Audio Option */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-[#161a2b] border border-[#232940] cursor-pointer hover:bg-[#1a1f33] transition-colors">
                <input
                  type="checkbox"
                  checked={muteAudio}
                  onChange={(e) => setMuteAudio(e.target.checked)}
                  className="rounded border-[#262c46] text-violet-600 focus:ring-0 w-4 h-4"
                />
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <VolumeX className="w-4 h-4 text-violet-400" />
                  <span>Mute Audio Track</span>
                </div>
              </label>

              {/* Resize Resolution */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Resolution Resize
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="original">Original ({selectedMedia.width}x{selectedMedia.height || "Auto"})</option>
                  <option value="1080">1080p Full HD</option>
                  <option value="720">720p HD</option>
                  <option value="480">480p SD</option>
                </select>
              </div>

              {/* Rotation */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Video Rotation
                </label>
                <select
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value={0}>No Rotation (0°)</option>
                  <option value={90}>Rotate 90° Clockwise</option>
                  <option value={180}>Rotate 180°</option>
                  <option value={270}>Rotate 270° Clockwise</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Aspect Ratio Crop
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="original">Original Aspect Ratio</option>
                  <option value="16:9">16:9 (Widescreen Landscape)</option>
                  <option value="9:16">9:16 (Vertical Reels / Shorts)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Classic TV)</option>
                </select>
              </div>

              {/* Framerate */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Frame Rate (FPS)
                </label>
                <select
                  value={framerate}
                  onChange={(e) => setFramerate(e.target.value)}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="original">Preserve Source Framerate</option>
                  <option value="60">60 FPS (Smooth)</option>
                  <option value="30">30 FPS (Standard)</option>
                  <option value="24">24 FPS (Cinematic)</option>
                </select>
              </div>

              {/* Output Container */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Output Container
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="mp4">MP4 (H.264 / AAC - Recommended)</option>
                  <option value="webm">WebM (VP9 / Opus)</option>
                  <option value="mkv">MKV (Matroska)</option>
                </select>
              </div>

              {/* Action Button */}
              <button
                onClick={handleStartTrim}
                disabled={Boolean(isStarting || (activeJob && !["completed", "failed", "cancelled"].includes(activeJob.status)))}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl shadow-lg shadow-violet-600/25 transition-all mt-4"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting Trim...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Export Trimmed Clip
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Result Box */}
      {activeJob && (
        <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white truncate max-w-md">{activeJob.title}</h3>
            <span className="text-xs font-mono text-violet-400 capitalize">{activeJob.status}</span>
          </div>

          <div className="w-full bg-[#1b2034] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, activeJob.progress)}%` }}
            />
          </div>

          {activeJob.status === "completed" && activeJob.output_filename && (
            <div className="pt-3 border-t border-[#1e2338] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Finished: <strong className="text-white">{activeJob.output_filename}</strong></span>
                {activeJob.output_size && (
                  <span>({formatBytes(activeJob.output_size)})</span>
                )}
              </div>

              <a
                href={`/api/media/download/${activeJob.id}`}
                download={activeJob.output_filename}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Trimmed Video</span>
              </a>
            </div>
          )}

          {activeJob.status === "failed" && (
            <p className="text-xs text-rose-400 pt-2 border-t border-[#1e2338]">
              Error: {activeJob.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading video editor...</div>}>
      <VideoEditorContent />
    </Suspense>
  );
}
