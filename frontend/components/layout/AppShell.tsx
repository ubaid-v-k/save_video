"use client";

import React, { useState, useEffect } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SystemHealth } from "@/types";
import { api } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchHealth = async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch {
        // backend might be starting
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          storageStats={health?.storage}
        />

        <Header
          onMenuClick={() => setMobileOpen(true)}
          collapsed={collapsed}
          health={health}
        />

        <main
          className={`flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto ${
            collapsed ? "lg:pl-24" : "lg:pl-68"
          }`}
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
