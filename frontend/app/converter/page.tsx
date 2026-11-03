"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  Download,
  Loader2,
  CheckCircle2,
  Film,
  Music,
  Sliders,
  FileCheck,
} from "lucide-react";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { MediaItem, Job } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatBytes, formatDuration } from "@/lib/formatters";

function ConverterContent() {
  const searchParams = useSearchParams();
  const mediaIdParam = searchParams.get("mediaId");

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>("mp4");
  const [customFilename, setCustomFilename] = useState<string>("");
  const [videoCodec, setVideoCodec] = useState<string>("h264");
  const [audioCodec, setAudioCodec] = useState<string>("aac");
  const [resolution, setResolution] = useState<string>("original");
  const [crf, setCrf] = useState<number>(23);

  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (mediaIdParam) {
      api.getMedia(mediaIdParam).then((m) => {
        setSelectedMedia(m);
        setCustomFilename(m.filename.replace(/\.[^/.]+$/, ""));
      }).catch(() => {});
    }
  }, [mediaIdParam]);

  const handleMediaLoaded = (m: MediaItem) => {
    setSelectedMedia(m);
    setCustomFilename(m.filename.replace(/\.[^/.]+$/, ""));
    setActiveJob(null);
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
          toast.success(`Converted successfully: ${j.output_filename}`);
        } else if (j.status === "failed") {
          toast.error(j.error || "Conversion failed");
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, toast]);

  const isTargetAudio = ["mp3", "wav", "aac", "flac", "ogg"].includes(outputFormat);

  const handleStartConversion = async () => {
    if (!selectedMedia) return;

    setIsStarting(true);
    try {
      const res = await api.queueFormatConvert({
        media_id: selectedMedia.id,
        output_format: outputFormat,
        custom_filename: customFilename.trim() || undefined,
        video_codec: isTargetAudio ? undefined : videoCodec,
        audio_codec: isTargetAudio ? undefined : audioCodec,
        resolution: resolution === "original" ? undefined : resolution,
        crf: crf,
      });

      const initialJob = await api.getJob(res.job_id);
      setActiveJob(initialJob);
      toast.info("Conversion job queued in background");
    } catch (err: any) {
      toast.error(err.message || "Failed to start conversion");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <RefreshCw className="w-6 h-6 text-emerald-400" />
          Format Converter
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Transcode video and audio into modern web containers (MP4, WebM, MKV, MP3, WAV, FLAC, OGG) with codec and resolution control.
        </p>
      </div>

      {/* Upload or Selected Input */}
      <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-6 shadow-xl">
        <UploadDropzone
          onFileUploaded={handleMediaLoaded}
          title="Drop file to convert format"
          subtitle="Supports all common video and audio files up to 2GB"
        />

        {selectedMedia && (
          <div className="p-4 rounded-2xl bg-[#161a2b] border border-[#262c46] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                {selectedMedia.media_type === "video" ? <Film className="w-6 h-6" /> : <Music className="w-6 h-6" />}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-white text-sm truncate max-w-sm" title={selectedMedia.filename}>
                  {selectedMedia.filename}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="text-emerald-400 font-semibold">{selectedMedia.format_name.toUpperCase()}</span>
                  <span>•</span>
                  <span>{formatBytes(selectedMedia.file_size)}</span>
                  <span>•</span>
                  <span>{formatDuration(selectedMedia.duration)}</span>
                  {selectedMedia.width && selectedMedia.height && (
                    <span>• {selectedMedia.width}x{selectedMedia.height}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#1e2338]">
          {/* Target Format */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Target Output Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <optgroup label="Video Containers">
                <option value="mp4">MP4 (H.264 / AAC - Universal)</option>
                <option value="webm">WebM (VP9 / Opus - Modern Web)</option>
                <option value="mkv">MKV (Matroska Media)</option>
                <option value="mov">MOV (QuickTime Movie)</option>
              </optgroup>
              <optgroup label="Audio Containers">
                <option value="mp3">MP3 (Universal Audio)</option>
                <option value="wav">WAV (Lossless PCM)</option>
                <option value="aac">AAC (Advanced Audio)</option>
                <option value="flac">FLAC (Lossless)</option>
                <option value="ogg">OGG (Vorbis)</option>
              </optgroup>
            </select>
          </div>

          {/* Custom Filename */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Custom Output Name (Optional)
            </label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="e.g. presentation_hd"
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Video Codec (when video target) */}
          {!isTargetAudio && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Video Codec
                </label>
                <select
                  value={videoCodec}
                  onChange={(e) => setVideoCodec(e.target.value)}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="h264">H.264 / AVC (Most Compatible)</option>
                  <option value="vp9">VP9 (High Efficiency Web)</option>
                  <option value="copy">Stream Copy (Direct copy without re-encoding)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Resolution Scale
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="original">Preserve Original Dimensions</option>
                  <option value="1080">1080p Full HD</option>
                  <option value="720">720p HD</option>
                  <option value="480">480p SD</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Quality preset slider (CRF) */}
        {!isTargetAudio && videoCodec !== "copy" && (
          <div className="p-4 rounded-2xl bg-[#141826] border border-[#20263c] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">Compression Quality (CRF)</span>
              <span className="font-mono text-emerald-400">CRF {crf} ({crf <= 18 ? "Near-Lossless" : crf <= 24 ? "High Quality" : "Compressed"})</span>
            </div>
            <input
              type="range"
              min="16"
              max="32"
              value={crf}
              onChange={(e) => setCrf(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#20253b] rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Higher Quality (Larger File)</span>
              <span>Lower Quality (Smaller File)</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartConversion}
            disabled={Boolean(!selectedMedia || isStarting || (activeJob && !["completed", "failed", "cancelled"].includes(activeJob.status)))}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting Conversion...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Start Conversion
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Job Progress */}
      {activeJob && (
        <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white truncate max-w-md">{activeJob.title}</h3>
            <span className="text-xs font-mono text-emerald-400 capitalize">{activeJob.status}</span>
          </div>

          <div className="w-full bg-[#1b2034] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, activeJob.progress)}%` }}
            />
          </div>

          {activeJob.status === "completed" && activeJob.output_filename && (
            <div className="pt-3 border-t border-[#1e2338] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Output Ready: <strong className="text-white">{activeJob.output_filename}</strong></span>
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
                <span>Download Converted File</span>
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

export default function ConverterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading converter...</div>}>
      <ConverterContent />
    </Suspense>
  );
}
