import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaBox - Everything you need for your media",
  description:
    "Personal media toolkit for downloading authorized media, extracting audio, trimming videos, converting formats, and managing your local library.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090a0f] text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
