"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  Trash2,
  XCircle,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Ban,
  FileVideo,
  Music,
  Scissors,
  RefreshCw,
} from "lucide-react";
import { Job } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatBytes } from "@/lib/formatters";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const toast = useToast();

  const loadJobs = async () => {
    try {
      const res = await api.listJobs({
        status: statusFilter === "all" ? undefined : statusFilter,
        task_type: taskFilter === "all" ? undefined : taskFilter,
        search: search.trim() || undefined,
        limit: 100,
      });
      setJobs(res.jobs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 2500);
    return () => clearInterval(interval);
  }, [statusFilter, taskFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleCancelJob = async (id: string) => {
    try {
      await api.cancelJob(id);
      toast.info("Job cancellation requested");
      loadJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel job");
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await api.deleteJob(id);
      toast.success("Job record deleted from history");
      loadJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "download":
        return <Download className="w-4 h-4 text-indigo-400" />;
      case "trim":
        return <Scissors className="w-4 h-4 text-violet-400" />;
      case "audio_extract":
        return <Music className="w-4 h-4 text-cyan-400" />;
      case "convert":
        return <RefreshCw className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileVideo className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#111422] border border-[#21263c] space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Clock className="w-6 h-6 text-indigo-400" />
          Download & Processing History
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Monitor active tasks, examine error details, review job logs, and download completed media clips.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111422] border border-[#21263c]">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title or output filename..."
            className="w-full bg-[#161a2c] border border-[#24293f] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#161a2c] border border-[#24293f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="downloading">Downloading</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Task Type Filter */}
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="bg-[#161a2c] border border-[#24293f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Task Types</option>
            <option value="download">Downloads</option>
            <option value="trim">Trims</option>
            <option value="audio_extract">Audio Extractions</option>
            <option value="convert">Format Conversions</option>
          </select>
        </div>
      </div>

      {/* Jobs List / Table */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs">Loading task history...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#111422] border border-[#21263c] text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-semibold text-slate-200 text-base">No tasks in history</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search ? "No tasks match your search." : "Whenever you download, trim, extract, or convert media, progress logs will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#111422] border border-[#21263c] overflow-hidden divide-y divide-[#1e2338]">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#141829] transition-colors"
            >
              {/* Left Column: Icon, Title, Source, Timestamps */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#161a2c] border border-[#24293f] flex items-center justify-center shrink-0 mt-0.5">
                  {getTaskIcon(j.task_type)}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm text-white truncate max-w-md" title={j.title}>
                      {j.title}
                    </p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181c2d] text-slate-400 border border-[#252a42]">
                      ID: {j.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="truncate max-w-xs text-slate-500" title={j.source}>
                      {j.source}
                    </span>
                    <span>•</span>
                    <span>{formatDate(j.created_at)}</span>
                    {j.output_size && (
                      <>
                        <span>•</span>
                        <span>{formatBytes(j.output_size)}</span>
                      </>
                    )}
                  </div>

                  {/* Error Details */}
                  {j.error && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 mt-2 leading-relaxed">
                      {j.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Status Badge, Progress, Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#1e2338]">
                <StatusBadge status={j.status} progress={j.progress} />

                <div className="flex items-center gap-1.5">
                  {["queued", "downloading", "processing"].includes(j.status) && (
                    <button
                      onClick={() => handleCancelJob(j.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 border border-[#252a42] hover:border-rose-500/30 transition-colors"
                      title="Cancel Job"
                    >
                      Cancel
                    </button>
                  )}

                  {j.status === "completed" && j.output_filename && (
                    <a
                      href={`/api/media/download/${j.id}`}
                      download={j.output_filename}
                      className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                      title="Download Output"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteJob(j.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#1a1f33] transition-colors"
                    title="Delete History Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
