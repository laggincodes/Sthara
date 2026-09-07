"use client";

import React from "react";

export function ViewerLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-slate-800/80 bg-[#111827]/90 p-2.5 backdrop-blur-md shadow-lg pointer-events-auto">
      <div className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-1.5">
        Cadastral 3D Entities
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/80 border border-cyan-400" />
          <span className="text-slate-300">Building Envelope</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80 border border-emerald-400" />
          <span className="text-slate-300">Floor Level</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/80 border border-violet-400" />
          <span className="text-slate-300">Property Volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400/90 border border-cyan-300" />
          <span className="text-slate-300">Apartment Unit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600/90 border border-blue-400" />
          <span className="text-slate-300">Basement Strata</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-600/90 border border-amber-400" />
          <span className="text-slate-300">Utility Conduit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 border border-amber-300" />
          <span className="text-amber-200">Selected / Active</span>
        </div>
      </div>
      <div className="text-[8px] font-mono text-slate-500 mt-1.5 pt-1 border-t border-slate-800">
        Coordinates: Local metric offsets (Z-up) • Datum: EGM2008
      </div>
    </div>
  );
}
