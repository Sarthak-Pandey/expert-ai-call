import type { Metadata } from "next";
import React from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expert Call AI Analyst",
  description: "AI-powered analysis of three expert interviews with grounded evidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
