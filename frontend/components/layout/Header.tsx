"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { SystemHealth } from "@/types";
import { api } from "@/lib/api";

interface HeaderProps {
  onMenuClick: () => void;
  collapsed: boolean;
  health: SystemHealth | null;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Your media workspace" },
  "/downloader": { title: "Video Downloader", subtitle: "Download authorized media directly" },
  "/audio": { title: "Audio Extractor", subtitle: "Extract and transcode audio to MP3, WAV & AAC" },
  "/editor": { title: "Video Editor & Trimmer", subtitle: "Cut, resize, rotate and adjust video clips" },
  "/converter": { title: "Format Converter", subtitle: "Convert video and audio between compatible formats" },
  "/library": { title: "My Media", subtitle: "Local media library and exports" },
  "/history": { title: "Download History", subtitle: "Background processing and download tasks" },
  "/settings": { title: "Settings", subtitle: "Application preferences and engine configuration" },
};

export function Header({ onMenuClick, collapsed, health }: HeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Check saved theme or system preference
    const saved = localStorage.getItem("mediabox_theme") || "dark";
    if (saved === "light") {
      document.documentElement.classList.add("light");
      setTheme("light");
    } else {
      document.documentElement.classList.remove("light");
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.add("light");
      localStorage.setItem("mediabox_theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("mediabox_theme", "dark");
      setTheme("dark");
    }
  };

  const pageInfo = pageTitles[pathname] || { title: "MediaBox", subtitle: "Personal Media Suite" };
  const isHealthy = health?.status === "healthy";
  const activeJobs = health?.jobs?.active ?? 0;

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-[#090a0f]/80 backdrop-blur-md border-b border-[#1e2235] flex items-center justify-between px-4 lg:px-8 transition-all duration-300 ${
        collapsed ? "lg:pl-24" : "lg:pl-68"
      }`}
    >
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161a29] transition-colors"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
            {pageInfo.title}
          </h1>
          <span className="text-[11px] text-slate-400 hidden sm:inline-block leading-tight mt-0.5">
            {pageInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Right: Engine Status, Active Jobs, Privacy Pill, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Local-first Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local & Private</span>
        </div>

        {/* System / FFmpeg Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            isHealthy
              ? "bg-[#101923] text-cyan-400 border-cyan-500/30"
              : "bg-[#251b14] text-amber-400 border-amber-500/30"
          }`}
          title={
            health
              ? `FFmpeg: ${health.ffmpeg.ffmpeg_version || "OK"}\nUptime: ${health.uptime_seconds}s`
              : "Connecting to backend..."
          }
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHealthy ? "bg-cyan-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isHealthy ? "bg-cyan-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="hidden sm:inline">
            {isHealthy ? "FFmpeg Engine Ready" : "Degraded Engine"}
          </span>
          <span className="sm:hidden">{isHealthy ? "Ready" : "Degraded"}</span>
        </div>

        {/* Active Jobs Pill */}
        {activeJobs > 0 && (
          <Link
            href="/history"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-500/25 transition-colors"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>
              {activeJobs} {activeJobs === 1 ? "Job" : "Jobs"} Active
            </span>
          </Link>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161a29] border border-transparent hover:border-[#24293f] transition-all"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
