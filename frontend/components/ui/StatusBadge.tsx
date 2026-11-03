import React from "react";
import { CheckCircle2, XCircle, Clock, Loader2, Ban } from "lucide-react";
import { JobStatus } from "@/types";

interface StatusBadgeProps {
  status: JobStatus;
  progress?: number;
}

export function StatusBadge({ status, progress }: StatusBadgeProps) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Ban className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    case "downloading":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Downloading {progress !== undefined ? `${Math.round(progress)}%` : ""}
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing {progress !== undefined ? `${Math.round(progress)}%` : ""}
        </span>
      );
    case "analyzing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Analyzing
        </span>
      );
    case "queued":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" />
          Queued
        </span>
      );
  }
}
