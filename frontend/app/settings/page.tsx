"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  HardDrive,
  Cpu,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  Save,
  ShieldCheck,
  RefreshCw,
  Folder,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatBytes } from "@/lib/formatters";
import { SystemHealth } from "@/types";

export default function SettingsPage() {
  const [settingsData, setSettingsData] = useState<any>({
    theme: "dark",
    default_format: "mp4",
    default_quality: "best",
    default_audio_bitrate: "192k",
    media_dir: "",
  });
  const [capabilities, setCapabilities] = useState<any>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanedCount, setCleanedCount] = useState<number | null>(null);
  const toast = useToast();

  const loadData = async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        api.getSettings(),
        api.getHealth(),
      ]);
      setSettingsData(sRes.settings);
      setCapabilities(sRes.capabilities);
      setHealth(hRes);
    } catch (err: any) {
      toast.error(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        default_format: settingsData.default_format,
        default_quality: settingsData.default_quality,
        default_audio_bitrate: settingsData.default_audio_bitrate,
      });
      toast.success("Preferences updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  const handleCleanupTemp = async () => {
    setCleaning(true);
    try {
      const res = await api.cleanupTemp();
      setCleanedCount(res.cleaned_files);
      toast.success(`Cleanup complete: removed ${res.cleaned_files} temporary files`);
    } catch (err: any) {
      toast.error(err.message || "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-indigo-400" />
          Settings & Diagnostics
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Configure default processing parameters, clean temporary files, and inspect local FFmpeg capabilities.
        </p>
      </div>

      {/* Engine & Environment Diagnostics */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-5 shadow-xl">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          Processing Engine Diagnostics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* FFmpeg Status */}
          <div className="p-4 rounded-2xl bg-[#161a2b] border border-[#252a42] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">FFmpeg Binary</span>
              {health?.ffmpeg.ffmpeg_available ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing
                </span>
              )}
            </div>
            <p className="text-slate-400 break-all font-mono text-[11px]">
              {health?.ffmpeg.ffmpeg_path || "Not detected"}
            </p>
            {health?.ffmpeg.ffmpeg_version && (
              <p className="text-[11px] text-slate-500 truncate" title={health.ffmpeg.ffmpeg_version}>
                {health.ffmpeg.ffmpeg_version}
              </p>
            )}
          </div>

          {/* FFprobe Status */}
          <div className="p-4 rounded-2xl bg-[#161a2b] border border-[#252a42] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">FFprobe Binary</span>
              {health?.ffmpeg.ffprobe_available ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing
                </span>
              )}
            </div>
            <p className="text-slate-400 break-all font-mono text-[11px]">
              {health?.ffmpeg.ffprobe_path || "Not detected"}
            </p>
            {health?.ffmpeg.ffprobe_version && (
              <p className="text-[11px] text-slate-500 truncate" title={health.ffmpeg.ffprobe_version}>
                {health.ffmpeg.ffprobe_version}
              </p>
            )}
          </div>

          {/* Python Runtime */}
          <div className="p-4 rounded-2xl bg-[#161a2b] border border-[#252a42] space-y-1">
            <span className="font-semibold text-white">Python Runtime</span>
            <p className="text-slate-400">Version: {health?.python_version || "-"}</p>
            <p className="text-slate-500 text-[11px]">Backend Uptime: {health?.uptime_seconds}s</p>
          </div>

          {/* Concurrent Workers */}
          <div className="p-4 rounded-2xl bg-[#161a2b] border border-[#252a42] space-y-1">
            <span className="font-semibold text-white">Concurrent Processing Limit</span>
            <p className="text-slate-400">{capabilities?.max_concurrent_jobs ?? 2} simultaneous FFmpeg processes</p>
            <p className="text-slate-500 text-[11px]">Prevents local CPU and memory exhaustion</p>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSavePreferences} className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-5 shadow-xl">
        <h3 className="font-bold text-white text-base">Default Preferences</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Default Video Format
            </label>
            <select
              value={settingsData.default_format}
              onChange={(e) => setSettingsData({ ...settingsData, default_format: e.target.value })}
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="mp4">MP4 (H.264 / AAC)</option>
              <option value="webm">WebM (VP9 / Opus)</option>
              <option value="mkv">MKV (Matroska)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Default Download Quality
            </label>
            <select
              value={settingsData.default_quality}
              onChange={(e) => setSettingsData({ ...settingsData, default_quality: e.target.value })}
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="best">Best Available</option>
              <option value="1080">1080p Full HD</option>
              <option value="720">720p HD</option>
              <option value="audio">Audio Only (MP3)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Default Audio Bitrate
            </label>
            <select
              value={settingsData.default_audio_bitrate}
              onChange={(e) => setSettingsData({ ...settingsData, default_audio_bitrate: e.target.value })}
              className="w-full bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="320k">320 kbps (Maximum)</option>
              <option value="256k">256 kbps (Very High)</option>
              <option value="192k">192 kbps (Standard)</option>
              <option value="128k">128 kbps (Voice)</option>
            </select>
          </div>
        </div>

        {/* Media Storage Directory */}
        <div className="pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Configured Media Storage Path
          </label>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#161a2c] border border-[#262c46] text-xs font-mono text-slate-300">
            <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{settingsData.media_dir || "backend/storage/media"}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Path is sandboxed to protected local application storage to prevent path traversal.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Storage Maintenance */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-400" />
          Temporary Files & Storage Maintenance
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Clean up temporary download fragments and intermediate audio/video conversion buffers. Your completed media library files will remain safe.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {cleanedCount !== null && (
            <span className="text-xs text-emerald-400">
              Cleaned {cleanedCount} temporary files
            </span>
          )}

          <button
            onClick={handleCleanupTemp}
            disabled={cleaning}
            className="flex items-center gap-2 bg-[#1a1f33] hover:bg-[#222842] border border-[#293050] text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors ml-auto"
          >
            {cleaning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Cleaning...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clean Temporary Files</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
