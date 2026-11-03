"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Music,
  Download,
  Loader2,
  CheckCircle2,
  Sliders,
  Info,
  Film,
  Volume2,
} from "lucide-react";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { MediaItem, Job } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatBytes, formatDuration } from "@/lib/formatters";

function AudioExtractorContent() {
  const searchParams = useSearchParams();
  const mediaIdParam = searchParams.get("mediaId");

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>("mp3");
  const [bitrate, setBitrate] = useState<string>("192k");
  const [copyCodec, setCopyCodec] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (mediaIdParam) {
      api.getMedia(mediaIdParam).then((m) => {
        setSelectedMedia(m);
      }).catch(() => {});
    }
  }, [mediaIdParam]);

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
          toast.success(`Audio extracted: ${j.output_filename}`);
        } else if (j.status === "failed") {
          toast.error(j.error || "Audio extraction failed");
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, toast]);

  const handleStartExtraction = async () => {
    if (!selectedMedia) {
      toast.warning("Please upload or select a media file first");
      return;
    }

    setIsStarting(true);
    try {
      const res = await api.queueAudioExtract({
        media_id: selectedMedia.id,
        output_format: outputFormat,
        bitrate: bitrate,
        copy_codec: copyCodec,
      });

      const initialJob = await api.getJob(res.job_id);
      setActiveJob(initialJob);
      toast.info("Audio extraction task submitted");
    } catch (err: any) {
      toast.error(err.message || "Failed to start extraction");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Music className="w-6 h-6 text-cyan-400" />
          Audio Extractor & Converter
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Extract crystal-clear audio tracks from local video files or convert between audio formats (MP3, WAV, AAC, FLAC, OGG).
        </p>
      </div>

      {/* Upload or Selected Media Card */}
      <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-6 shadow-xl">
        <UploadDropzone
          onFileUploaded={(m) => {
            setSelectedMedia(m);
            setActiveJob(null);
          }}
          title="Drop video or audio file to extract audio"
          subtitle="Supports MP4, MKV, MOV, WebM, AVI, WAV, AAC, MP3 up to 2GB"
        />

        {selectedMedia && (
          <div className="p-4 rounded-2xl bg-[#161a2b] border border-[#262c46] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                {selectedMedia.media_type === "video" ? <Film className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-white text-sm truncate max-w-sm" title={selectedMedia.filename}>
                  {selectedMedia.filename}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{selectedMedia.format_name.toUpperCase()}</span>
                  <span>•</span>
                  <span>{formatBytes(selectedMedia.file_size)}</span>
                  <span>•</span>
                  <span>{formatDuration(selectedMedia.duration)}</span>
                  {selectedMedia.audio_codec && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-400">Codec: {selectedMedia.audio_codec}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <audio
              controls
              src={api.getStreamUrl(selectedMedia.id)}
              className="w-full sm:w-64 h-9"
            />
          </div>
        )}

        {/* Extraction Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1e2338]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Output Audio Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="mp3">MP3 (MPEG Audio Layer III - Recommended)</option>
              <option value="wav">WAV (Uncompressed PCM Studio Quality)</option>
              <option value="aac">AAC (Advanced Audio Coding)</option>
              <option value="flac">FLAC (Lossless Compression)</option>
              <option value="ogg">OGG (Vorbis)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Bitrate Quality (for MP3 & AAC)
            </label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              disabled={outputFormat === "wav" || outputFormat === "flac"}
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="320k">320 kbps (Maximum Quality)</option>
              <option value="256k">256 kbps (Very High Quality)</option>
              <option value="192k">192 kbps (Standard High Quality - Default)</option>
              <option value="128k">128 kbps (Compact Voice / Speech)</option>
            </select>
          </div>
        </div>

        {/* Quality note */}
        <div className="p-3.5 rounded-xl bg-[#141724] border border-[#202538] text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Note: Selecting 320 kbps ensures maximum encoding fidelity, but cannot recover frequency details that were already absent in lower-bitrate source audio.
          </p>
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartExtraction}
            disabled={Boolean(!selectedMedia || isStarting || (activeJob && !["completed", "failed", "cancelled"].includes(activeJob.status)))}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                Extract Audio Track
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress & Result */}
      {activeJob && (
        <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white truncate max-w-md">{activeJob.title}</h3>
            <span className="text-xs font-mono text-cyan-400 capitalize">{activeJob.status}</span>
          </div>

          <div className="w-full bg-[#1b2034] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, activeJob.progress)}%` }}
            />
          </div>

          {activeJob.status === "completed" && activeJob.output_filename && (
            <div className="pt-3 border-t border-[#1e2338] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Extracted: <strong className="text-white">{activeJob.output_filename}</strong></span>
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
                <span>Download Audio</span>
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

export default function AudioExtractorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading audio extractor...</div>}>
      <AudioExtractorContent />
    </Suspense>
  );
}
