"use client";

import React from "react";

export function ViewerLegend() {
  return (
    <div
      className="absolute bottom-3 left-3 z-10 rounded-md p-2.5 shadow-lg pointer-events-auto"
      style={{
        backgroundColor: "rgba(248,246,240,0.90)",
        border: "1px solid rgba(215,212,203,0.80)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="text-[9px] uppercase tracking-wider font-semibold mb-1.5"
        style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
      >
        Cadastral 3D Entities
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        {[
          { color: "#A85D48", label: "Building Envelope" },
          { color: "#788575", label: "Floor Level" },
          { color: "#B28A52", label: "Property Volume" },
          { color: "#A85D48", label: "Apartment Unit", opacity: 0.6 },
          { color: "#6B7A8D", label: "Basement Strata" },
          { color: "#C09060", label: "Utility Conduit" },
          { color: "#D4A840", label: "Selected / Active" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{
                backgroundColor: item.opacity ? `${item.color}${Math.round(item.opacity * 255).toString(16).padStart(2, "0")}` : item.color,
                border: `1px solid ${item.color}88`,
              }}
            />
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div
        className="text-[8px] mt-1.5 pt-1"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--sth-text-2)",
          borderTop: "1px solid var(--sth-border)",
        }}
      >
        Coordinates: Local metric offsets (Z-up) · Datum: EGM2008
      </div>
    </div>
  );
}
