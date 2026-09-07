"use client";

import React from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-100 font-sans">
      {/* Desktop Persistent Sidebar */}
      <AppSidebar />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        <AppHeader />
        <div className="flex-1 h-full overflow-hidden relative min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
