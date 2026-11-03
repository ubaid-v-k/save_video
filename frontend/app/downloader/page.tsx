"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Film,
  Music,
  ExternalLink,
  ShieldCheck,
  Info,
  Clock,
  HardDrive,
} from "lucide-react";
import { UrlInputBar } from "@/components/ui/UrlInputBar";
import { UrlAnalysis, Job } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatDuration, formatBytes } from "@/lib/formatters";

function DownloaderContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");

  const [analysis, setAnalysis] = useState<UrlAnalysis | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("best");
  const [selectedFormat, setSelectedFormat] = useState<string>("mp4");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (urlParam) {
      api.analyzeUrl(urlParam).then((res) => {
        setAnalysis(res);
        if (res.title) setCustomTitle(res.title);
      }).catch(() => {});
    }
  }, [urlParam]);

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
          toast.success(`Download ready: ${j.output_filename}`);
        } else if (j.status === "failed") {
          toast.error(j.error || "Download failed");
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, toast]);

  const handleAnalyzed = (res: UrlAnalysis) => {
    setAnalysis(res);
    setActiveJob(null);
    if (res.title) setCustomTitle(res.title);
  };

  const handleStartDownload = async () => {
    if (!analysis || !analysis.url) return;

    setIsStarting(true);
    try {
      const res = await api.startDownload({
        url: analysis.url,
        quality: selectedQuality,
        format_ext: selectedQuality === "audio" ? "mp3" : selectedFormat,
        title: customTitle.trim() || undefined,
      });

      const initialJob = await api.getJob(res.job_id);
      setActiveJob(initialJob);
      toast.info("Download job started in background");
    } catch (err: any) {
      toast.error(err.message || "Failed to start download");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await api.cancelJob(activeJob.id);
      toast.info("Job cancellation requested");
    } catch (err: any) {
      toast.error(err.message || "Could not cancel job");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Video & Audio Downloader
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Analyze and save authorized media from direct links, YouTube, Instagram, and supported sources.
          </p>
        </div>

        <UrlInputBar onAnalyzed={handleAnalyzed} />
      </div>

      {/* Analysis Result Display */}
      {analysis && (
        <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-6 shadow-xl animate-fade-in">
          {analysis.supported ? (
            <>
              {/* Media Card Header */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="relative aspect-video w-full sm:w-64 rounded-xl bg-black/60 overflow-hidden shrink-0 border border-[#232942]">
                  {analysis.thumbnail ? (
                    <img
                      src={analysis.thumbnail}
                      alt={analysis.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Film className="w-12 h-12" />
                    </div>
                  )}
                  {analysis.duration && analysis.duration > 0 ? (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-xs font-mono text-white">
                      {formatDuration(analysis.duration)}
                    </span>
                  ) : null}
                </div>

                <div className="flex-1 space-y-3 min-w-0 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {analysis.source_type || "Direct Media"}
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Authorized & Permitted
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400">Media Title</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full mt-1 bg-[#161a2c] border border-[#262c46] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                    {analysis.duration && analysis.duration > 0 ? (
                      <span>Duration: <strong className="text-white">{formatDuration(analysis.duration)}</strong></span>
                    ) : null}
                    {analysis.file_size ? (
                      <span>Estimated Size: <strong className="text-white">{formatBytes(analysis.file_size)}</strong></span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quality & Format Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#1e2338]">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Select Quality / Stream
                  </label>
                  <select
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(analysis.qualities || []).map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label} {q.filesize ? `(~${formatBytes(q.filesize)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Output Format
                  </label>
                  <select
                    value={selectedQuality === "audio" ? "mp3" : selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    disabled={selectedQuality === "audio"}
                    className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    {selectedQuality === "audio" ? (
                      <option value="mp3">MP3 (Audio)</option>
                    ) : (
                      <>
                        <option value="mp4">MP4 (H.264 / AAC - Universal)</option>
                        <option value="webm">WebM (VP9 / Opus)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Files are saved directly to your local computer
                </p>

                <button
                  onClick={handleStartDownload}
                  disabled={Boolean(isStarting || (activeJob && !["completed", "failed", "cancelled"].includes(activeJob.status)))}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting Job...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Start Download Job
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-amber-200 text-sm">Content Not Accessible or Restricted</h4>
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    {analysis.error}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400 border-t border-amber-500/20 flex flex-wrap items-center gap-4">
                <span>Authorized Alternative:</span>
                <span className="text-white">Use local file upload in Video Editor or Audio Extractor.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Job Progress Display */}
      {activeJob && (
        <div className="rounded-3xl bg-[#111422] border border-[#21263c] p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-400 font-medium">Task ID: {activeJob.id.slice(0, 8)}...</span>
              <h3 className="text-base font-bold text-white truncate max-w-md">{activeJob.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {["queued", "downloading", "processing"].includes(activeJob.status) && (
                <button
                  onClick={handleCancelJob}
                  className="text-xs text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-[#262c46] hover:border-rose-500/40 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="capitalize text-indigo-400 font-medium">
                {activeJob.status}...
              </span>
              <span className="font-mono text-slate-300">
                {Math.round(activeJob.progress)}%
              </span>
            </div>
            <div className="w-full bg-[#1b2034] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, activeJob.progress)}%` }}
              />
            </div>
          </div>

          {/* Completed State */}
          {activeJob.status === "completed" && activeJob.output_filename && (
            <div className="pt-3 border-t border-[#1e2338] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved as: <strong className="text-white">{activeJob.output_filename}</strong></span>
                {activeJob.output_size && (
                  <span>({formatBytes(activeJob.output_size)})</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/media/download/${activeJob.id}`}
                  download={activeJob.output_filename}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}

          {activeJob.status === "failed" && (
            <p className="text-xs text-rose-400 pt-2 border-t border-[#1e2338]">
              Error: {activeJob.error}
            </p>
          )}
        </div>
      )}

      {/* Policy & Guidance Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
        <div className="p-4 rounded-2xl bg-[#111422] border border-[#21263c] space-y-1.5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Info className="w-4 h-4 text-indigo-400" />
            Direct Media URLs
          </div>
          <p className="leading-relaxed">
            Full support for direct MP4, WebM, MP3, and AAC links from public servers and CDNs with resumable streaming.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111422] border border-[#21263c] space-y-1.5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Info className="w-4 h-4 text-cyan-400" />
            YouTube & Public Videos
          </div>
          <p className="leading-relaxed">
            Supports authorized public videos. Paywalled, age-gated, or login-restricted media cannot be downloaded directly.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111422] border border-[#21263c] space-y-1.5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Info className="w-4 h-4 text-violet-400" />
            Instagram & Facebook
          </div>
          <p className="leading-relaxed">
            Permitted for public content only. Private accounts and login-restricted posts are respected. Use local file uploads instead.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DownloaderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading downloader...</div>}>
      <DownloaderContent />
    </Suspense>
  );
}
