"use client";

import React, { useState } from "react";
import { Link2, Clipboard, X, Search, Loader2 } from "lucide-react";
import { UrlAnalysis } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface UrlInputBarProps {
  onAnalyzed: (analysis: UrlAnalysis) => void;
  placeholder?: string;
}

export function UrlInputBar({
  onAnalyzed,
  placeholder = "Paste YouTube, Instagram, Facebook or direct video/audio URL...",
}: UrlInputBarProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      toast.info("Please paste the URL directly into the field (clipboard permission not granted)");
    }
  };

  const handleClear = () => {
    setUrl("");
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) {
      toast.warning("Please enter a media URL to analyze");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.analyzeUrl(url.trim());
      onAnalyzed(res);
      if (res.supported) {
        toast.success("Media URL analyzed successfully!");
      } else {
        toast.error(res.error || "This media source or URL is not supported");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze URL");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleAnalyze} className="w-full">
      <div className="relative flex items-center rounded-2xl bg-[#111422] border border-[#232840] focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-lg shadow-black/30 transition-all p-1.5">
        <div className="pl-3.5 pr-2 text-slate-400">
          <Link2 className="w-5 h-5 text-indigo-400" />
        </div>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent py-2.5 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none min-w-0"
        />

        <div className="flex items-center gap-1.5 pr-1">
          {url ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1f33] transition-colors"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#1a1f33] border border-transparent hover:border-[#282f4c] transition-colors"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 transition-all shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
