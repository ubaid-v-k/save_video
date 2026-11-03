"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, Download, Scissors, Music, RefreshCw, Film } from "lucide-react";
import { MediaItem } from "@/types";
import { api } from "@/lib/api";
import { formatBytes, formatDuration } from "@/lib/formatters";

interface MediaPlayerModalProps {
  media: MediaItem | null;
  onClose: () => void;
}

export function MediaPlayerModal({ media, onClose }: MediaPlayerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!media) return null;

  const streamUrl = api.getStreamUrl(media.id);
  const downloadUrl = api.getDownloadUrl(media.id);
  const isVideo = media.media_type === "video";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#111422] border border-[#232840] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2338] bg-[#0d0f1a]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
              {isVideo ? <Film className="w-4 h-4" /> : <Music className="w-4 h-4" />}
            </div>
            <h3 className="font-semibold text-white text-sm sm:text-base truncate">
              {media.filename}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1f33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Body */}
        <div className="flex-1 overflow-y-auto bg-black flex flex-col items-center justify-center min-h-[300px] p-2 sm:p-4">
          {isVideo ? (
            <video
              src={streamUrl}
              controls
              autoPlay
              className="max-h-[60vh] w-full rounded-lg object-contain shadow-lg"
            >
              Your browser does not support HTML5 video streaming.
            </video>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center gap-6 py-12 px-6 rounded-2xl bg-[#161a29] border border-[#242a42]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <Music className="w-10 h-10" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-base truncate max-w-xs">{media.filename}</p>
                <p className="text-xs text-slate-400 mt-1">Audio Stream • {media.format_name.toUpperCase()}</p>
              </div>
              <audio src={streamUrl} controls autoPlay className="w-full">
                Your browser does not support HTML5 audio playback.
              </audio>
            </div>
          )}
        </div>

        {/* Modal Footer with Metadata and Action Shortcuts */}
        <div className="p-4 bg-[#0d0f1a] border-t border-[#1e2338] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-400">
            <span>Size: <strong className="text-white">{formatBytes(media.file_size)}</strong></span>
            <span>Duration: <strong className="text-white">{formatDuration(media.duration)}</strong></span>
            <span>Format: <strong className="text-white">{media.format_name.toUpperCase()}</strong></span>
            {media.width && media.height && (
              <span>Resolution: <strong className="text-white">{media.width}x{media.height}</strong></span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isVideo && (
              <>
                <Link
                  href={`/editor?mediaId=${media.id}`}
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181c2d] hover:bg-[#20253d] text-slate-200 border border-[#272e48] transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Trim</span>
                </Link>
                <Link
                  href={`/audio?mediaId=${media.id}`}
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181c2d] hover:bg-[#20253d] text-slate-200 border border-[#272e48] transition-colors"
                >
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Extract MP3</span>
                </Link>
              </>
            )}
            <Link
              href={`/converter?mediaId=${media.id}`}
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181c2d] hover:bg-[#20253d] text-slate-200 border border-[#272e48] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Convert</span>
            </Link>
            <a
              href={downloadUrl}
              download={media.filename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
