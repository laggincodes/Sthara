"use client";

import React from "react";

export interface ViewerLoadingProps {
  message?: string;
}

export function ViewerLoading({ message = "Constructing 3D cadastral scene..." }: ViewerLoadingProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0B0F19]/80 backdrop-blur-[2px] pointer-events-none">
      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-[#111827]/90 px-4 py-3 shadow-2xl">
        <span className="h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-mono text-cyan-200">
          <span className="font-semibold block">{message}</span>
          <span className="text-[10px] text-slate-400 font-sans">
            Validating 3D geometry and compiling Three.js buffer arrays
          </span>
        </div>
      </div>
    </div>
  );
}
