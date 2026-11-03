"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  Scissors,
  Music,
  RefreshCw,
  FolderHeart,
  Clock,
  HardDrive,
  Film,
  Play,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { UrlInputBar } from "@/components/ui/UrlInputBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MediaPlayerModal } from "@/components/ui/MediaPlayerModal";
import { Job, MediaItem, StorageStats, JobStats, UrlAnalysis } from "@/types";
import { api } from "@/lib/api";
import { formatBytes, formatDuration, formatDate } from "@/lib/formatters";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [jobsRes, mediaRes, statsRes, healthRes] = await Promise.allSettled([
        api.listJobs({ limit: 5 }),
        api.listMedia({ limit: 6, sort_by: "newest" }),
        api.getJobStats(),
        api.getHealth(),
      ]);

      if (jobsRes.status === "fulfilled") setRecentJobs(jobsRes.value.jobs);
      if (mediaRes.status === "fulfilled") setRecentMedia(mediaRes.value.items);
      if (statsRes.status === "fulfilled") setJobStats(statsRes.value);
      if (healthRes.status === "fulfilled") setStorage(healthRes.value.storage);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUrlAnalyzed = (analysis: UrlAnalysis) => {
    if (analysis.supported) {
      router.push(`/downloader?url=${encodeURIComponent(analysis.url)}`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero Welcome & URL Bar */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#121626] via-[#101322] to-[#0d0f1a] border border-[#232942] p-6 sm:p-10 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <span>Local Media Suite</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Your media workspace.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Download authorized web media, extract studio audio, trim frame-accurate video clips, and convert formats with local FFmpeg processing.
          </p>

          <div className="pt-3">
            <UrlInputBar onAnalyzed={handleUrlAnalyzed} />
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/downloader"
          className="group relative p-5 rounded-2xl bg-[#111422] hover:bg-[#15192b] border border-[#21263d] hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between overflow-hidden"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-white text-sm sm:text-base group-hover:text-indigo-400 transition-colors">
              Downloader
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Authorized web videos
            </p>
          </div>
        </Link>

        <Link
          href="/editor"
          className="group relative p-5 rounded-2xl bg-[#111422] hover:bg-[#15192b] border border-[#21263d] hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between overflow-hidden"
        >
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Scissors className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-white text-sm sm:text-base group-hover:text-violet-400 transition-colors">
              Video Editor
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Trim, resize & rotate
            </p>
          </div>
        </Link>

        <Link
          href="/audio"
          className="group relative p-5 rounded-2xl bg-[#111422] hover:bg-[#15192b] border border-[#21263d] hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between overflow-hidden"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Music className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-white text-sm sm:text-base group-hover:text-cyan-400 transition-colors">
              Audio Extractor
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Export high-bitrate MP3
            </p>
          </div>
        </Link>

        <Link
          href="/converter"
          className="group relative p-5 rounded-2xl bg-[#111422] hover:bg-[#15192b] border border-[#21263d] hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between overflow-hidden"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-white text-sm sm:text-base group-hover:text-emerald-400 transition-colors">
              Format Converter
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              MP4, WebM, MKV, WAV
            </p>
          </div>
        </Link>
      </div>

      {/* Storage and Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Media Size */}
        <div className="p-5 rounded-2xl bg-[#111422] border border-[#20253b] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-slate-400">Library Storage</p>
            <p className="text-xl font-bold text-white mt-0.5 truncate">
              {formatBytes(storage?.media_size_bytes)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {storage?.media_count ?? 0} files in local library
            </p>
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="p-5 rounded-2xl bg-[#111422] border border-[#20253b] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-slate-400">Completed Tasks</p>
            <p className="text-xl font-bold text-white mt-0.5 truncate">
              {jobStats?.completed ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {jobStats?.active ?? 0} active now
            </p>
          </div>
        </div>

        {/* Disk Space Meter */}
        <div className="p-5 rounded-2xl bg-[#111422] border border-[#20253b] flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">Drive Available</span>
            <span className="font-semibold text-white">{formatBytes(storage?.disk_free_bytes)} free</span>
          </div>
          <div className="w-full bg-[#1b2034] h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{
                width: `${
                  storage && storage.disk_total_bytes > 0
                    ? Math.round((storage.disk_used_bytes / storage.disk_total_bytes) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Total capacity: {formatBytes(storage?.disk_total_bytes)}
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Media & Active/Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Media (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Recently Added Media</h3>
            </div>
            <Link
              href="/library"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>View Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMedia.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111422] border border-[#20253b] text-center space-y-3">
              <FolderHeart className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Your library is empty</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Paste an authorized URL above or upload a video or audio file to start processing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentMedia.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMedia(m)}
                  className="group relative rounded-xl bg-[#111422] border border-[#20253b] hover:border-indigo-500/40 p-2.5 cursor-pointer transition-all hover:bg-[#141828] flex flex-col justify-between"
                >
                  <div className="relative aspect-video w-full rounded-lg bg-black/60 overflow-hidden flex items-center justify-center">
                    {m.thumbnail_path ? (
                      <img
                        src={m.thumbnail_path}
                        alt={m.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="text-slate-600">
                        {m.media_type === "audio" ? <Music className="w-8 h-8" /> : <Film className="w-8 h-8" />}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                    {m.duration > 0 && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {formatDuration(m.duration)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-slate-200 truncate" title={m.filename}>
                      {m.filename}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>{m.format_name.toUpperCase()}</span>
                      <span>{formatBytes(m.file_size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Recent Tasks</h3>
            </div>
            <Link
              href="/history"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-[#111422] border border-[#20253b] divide-y divide-[#1e2338] overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent activity. All completed jobs will appear here.
              </div>
            ) : (
              recentJobs.map((j) => (
                <div key={j.id} className="p-3.5 space-y-1.5 hover:bg-[#141829] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-200 truncate flex-1" title={j.title}>
                      {j.title}
                    </p>
                    <StatusBadge status={j.status} progress={j.progress} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="capitalize">{j.task_type.replace("_", " ")}</span>
                    <span>{formatDate(j.created_at)}</span>
                  </div>
                  {j.error && (
                    <p className="text-[11px] text-rose-400 line-clamp-1 truncate" title={j.error}>
                      {j.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <MediaPlayerModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </div>
  );
}
