"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Download,
  Music,
  Scissors,
  RefreshCw,
  FolderHeart,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Sparkles,
} from "lucide-react";
import { formatBytes } from "@/lib/formatters";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  storageStats?: {
    disk_total_bytes: number;
    disk_used_bytes: number;
    media_size_bytes: number;
  };
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/downloader", label: "Video Downloader", icon: Download },
  { href: "/audio", label: "Audio Extractor", icon: Music },
  { href: "/editor", label: "Video Editor", icon: Scissors },
  { href: "/converter", label: "Format Converter", icon: RefreshCw },
  { href: "/library", label: "My Media", icon: FolderHeart },
  { href: "/history", label: "Download History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  storageStats,
}: SidebarProps) {
  const pathname = usePathname();

  const usedPct =
    storageStats && storageStats.disk_total_bytes > 0
      ? Math.min(100, Math.round((storageStats.disk_used_bytes / storageStats.disk_total_bytes) * 100))
      : 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#0d0f18] border-r border-[#1e2235] transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1e2235]">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  MediaBox
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">
                    Pro
                  </span>
                </span>
                <span className="text-xs text-slate-400 truncate">
                  Personal Media Suite
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-[#161a29] border border-[#24293f] items-center justify-center text-slate-400 hover:text-white hover:bg-[#1e2338] transition-colors"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#151928]"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Storage Widget (When expanded) */}
        {!collapsed && storageStats && (
          <div className="p-4 m-3 rounded-2xl bg-[#131624] border border-[#20253b] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                Local Storage
              </span>
              <span>{usedPct}% used</span>
            </div>
            <div className="w-full bg-[#1e2338] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Media: {formatBytes(storageStats.media_size_bytes)}</span>
              <span>Total: {formatBytes(storageStats.disk_total_bytes)}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
