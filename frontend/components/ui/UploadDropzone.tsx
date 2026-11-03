"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileVideo, Music, Loader2, CheckCircle2 } from "lucide-react";
import { MediaItem } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatBytes } from "@/lib/formatters";

interface UploadDropzoneProps {
  onFileUploaded: (media: MediaItem) => void;
  acceptType?: "all" | "video" | "audio";
  title?: string;
  subtitle?: string;
}

export function UploadDropzone({
  onFileUploaded,
  acceptType = "all",
  title = "Drop your media file here",
  subtitle = "Drag and drop or click to browse from your computer",
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploading(true);
    try {
      const res = await api.uploadFile(file);
      setUploadedFile(res.media);
      onFileUploaded(res.media);
      toast.success(`"${file.name}" uploaded and analyzed successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all ${
        isDragging
          ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
          : "border-[#252a40] hover:border-indigo-500/50 bg-[#10131f]/70 hover:bg-[#121626]"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={
          acceptType === "video"
            ? "video/*,.mkv,.webm,.mov,.avi"
            : acceptType === "audio"
            ? "audio/*,.mp3,.wav,.aac,.flac,.ogg"
            : "video/*,audio/*,.mkv,.webm,.mov,.avi,.mp3,.wav,.aac,.flac,.ogg"
        }
        onChange={(e) => handleFiles(e.target.files)}
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="font-medium text-white text-sm">Processing & analyzing media...</p>
          <p className="text-xs text-slate-400">Probing streams and generating thumbnail</p>
        </div>
      ) : uploadedFile ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-semibold text-white text-sm truncate max-w-xs">{uploadedFile.filename}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{uploadedFile.format_name.toUpperCase()}</span>
            <span>•</span>
            <span>{formatBytes(uploadedFile.file_size)}</span>
            {uploadedFile.duration > 0 && (
              <>
                <span>•</span>
                <span>{Math.round(uploadedFile.duration)}s</span>
              </>
            )}
          </div>
          <p className="text-xs text-indigo-400 mt-1 hover:underline">Click to replace file</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            {acceptType === "audio" ? (
              <Music className="w-7 h-7" />
            ) : acceptType === "video" ? (
              <FileVideo className="w-7 h-7" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-base">{title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[11px] font-medium bg-[#181c2e] text-slate-400 px-2.5 py-1 rounded-md border border-[#232840]">
              MP4, MOV, MKV, WebM
            </span>
            <span className="text-[11px] font-medium bg-[#181c2e] text-slate-400 px-2.5 py-1 rounded-md border border-[#232840]">
              MP3, WAV, AAC, FLAC
            </span>
            <span className="text-[11px] font-medium bg-[#181c2e] text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/20">
              Up to 2 GB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
