"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderHeart,
  Search,
  Grid,
  List as ListIcon,
  Play,
  Download,
  Trash2,
  Edit2,
  RefreshCw,
  Film,
  Music,
  Scissors,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { MediaItem } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatBytes, formatDuration, formatDate } from "@/lib/formatters";
import { MediaPlayerModal } from "@/components/ui/MediaPlayerModal";

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [mediaType, setMediaType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals state
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [renameItem, setRenameItem] = useState<MediaItem | null>(null);
  const [newFilename, setNewFilename] = useState<string>("");
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MediaItem | null>(null);

  const toast = useToast();

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await api.listMedia({
        media_type: mediaType,
        search: search.trim() || undefined,
        sort_by: sortBy,
      });
      setItems(res.items);
    } catch (err: any) {
      toast.error(err.message || "Failed to load media library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [mediaType, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMedia();
  };

  const handleSync = async () => {
    try {
      const res = await api.syncMedia();
      setItems(res.items);
      toast.success(`Library synced: ${res.count} items found on disk`);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameItem || !newFilename.trim()) return;
    try {
      await api.renameMedia(renameItem.id, newFilename.trim());
      toast.success("File renamed successfully");
      setRenameItem(null);
      loadMedia();
    } catch (err: any) {
      toast.error(err.message || "Rename failed");
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.deleteMedia(deleteConfirmItem.id);
      toast.success(`"${deleteConfirmItem.filename}" deleted`);
      setDeleteConfirmItem(null);
      loadMedia();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111422] border border-[#21263c]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderHeart className="w-6 h-6 text-indigo-400" />
            My Media Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            All downloaded, trimmed, converted, and uploaded files saved on your computer.
          </p>
        </div>

        <button
          onClick={handleSync}
          className="flex items-center gap-2 bg-[#181c2d] hover:bg-[#20253d] text-slate-200 border border-[#262c46] px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sync Filesystem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111422] border border-[#21263c]">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename..."
            className="w-full bg-[#161a2c] border border-[#24293f] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center rounded-xl bg-[#161a2c] p-1 border border-[#24293f] text-xs">
            <button
              onClick={() => setMediaType("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mediaType === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setMediaType("video")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mediaType === "video" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setMediaType("audio")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mediaType === "audio" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Audio
            </button>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#161a2c] border border-[#24293f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="size_desc">Size (Largest)</option>
            <option value="size_asc">Size (Smallest)</option>
            <option value="duration_desc">Duration (Longest)</option>
            <option value="duration_asc">Duration (Shortest)</option>
          </select>

          {/* Grid / List View Toggle */}
          <div className="hidden sm:flex items-center rounded-xl bg-[#161a2c] p-1 border border-[#24293f]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-[#22273e] text-indigo-400" : "text-slate-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-[#22273e] text-indigo-400" : "text-slate-400 hover:text-white"
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items View */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs">Loading media collection...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#111422] border border-[#21263c] text-center space-y-3">
          <FolderHeart className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-semibold text-slate-200 text-base">No media found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search ? "No files match your search query." : "Your media library is currently empty. Download or process files to view them here."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((m) => (
            <div
              key={m.id}
              className="group rounded-2xl bg-[#111422] border border-[#21263c] hover:border-indigo-500/40 p-3 flex flex-col justify-between transition-all hover:bg-[#131726] shadow-md"
            >
              {/* Thumbnail / Preview Area */}
              <div
                onClick={() => setSelectedMedia(m)}
                className="relative aspect-video w-full rounded-xl bg-black/60 overflow-hidden cursor-pointer flex items-center justify-center group/thumb"
              >
                {m.thumbnail_path ? (
                  <img
                    src={m.thumbnail_path}
                    alt={m.filename}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-slate-600">
                    {m.media_type === "audio" ? <Music className="w-10 h-10" /> : <Film className="w-10 h-10" />}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                {m.duration > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                    {formatDuration(m.duration)}
                  </span>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="mt-3 space-y-1">
                <p
                  className="font-medium text-xs sm:text-sm text-slate-100 truncate cursor-pointer hover:text-indigo-400 transition-colors"
                  onClick={() => setSelectedMedia(m)}
                  title={m.filename}
                >
                  {m.filename}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="uppercase font-semibold text-indigo-400/80">{m.format_name}</span>
                  <span>{formatBytes(m.file_size)}</span>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1e2338]">
                <div className="flex items-center gap-1">
                  {m.media_type === "video" && (
                    <Link
                      href={`/editor?mediaId=${m.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1f33] transition-colors"
                      title="Trim Video"
                    >
                      <Scissors className="w-3.5 h-3.5 text-violet-400" />
                    </Link>
                  )}
                  <Link
                    href={`/converter?mediaId=${m.id}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1f33] transition-colors"
                    title="Convert Format"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>
                  <button
                    onClick={() => {
                      setRenameItem(m);
                      setNewFilename(m.filename);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1f33] transition-colors"
                    title="Rename File"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmItem(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#1a1f33] transition-colors"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a
                  href={api.getDownloadUrl(m.id)}
                  download={m.filename}
                  className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl bg-[#111422] border border-[#21263c] overflow-hidden divide-y divide-[#1e2338]">
          {items.map((m) => (
            <div
              key={m.id}
              className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#141829] transition-colors"
            >
              <div
                className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                onClick={() => setSelectedMedia(m)}
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                  {m.media_type === "video" ? <Film className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs sm:text-sm font-medium text-white truncate" title={m.filename}>
                    {m.filename}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDate(m.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-4 text-xs text-slate-400">
                <span className="font-mono">{formatDuration(m.duration)}</span>
                <span className="font-semibold uppercase text-indigo-400">{m.format_name}</span>
                <span>{formatBytes(m.file_size)}</span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setRenameItem(m);
                      setNewFilename(m.filename);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1f33]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmItem(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#1a1f33]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={api.getDownloadUrl(m.id)}
                    download={m.filename}
                    className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      {renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111422] border border-[#232840] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Rename Media File</h3>
            <div>
              <label className="text-xs font-medium text-slate-400">New filename</label>
              <input
                type="text"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                className="w-full mt-1.5 bg-[#161a2c] border border-[#262c46] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRenameItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#161218] border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">Delete Media File?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">"{deleteConfirmItem.filename}"</strong> from your local disk and library? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Modal */}
      <MediaPlayerModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </div>
  );
}
