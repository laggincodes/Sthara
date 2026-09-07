"use client";

import React, { createContext, useContext } from "react";
import { useCadastre } from "@/hooks/useCadastre";

type CadastreContextType = ReturnType<typeof useCadastre>;

const CadastreContext = createContext<CadastreContextType | null>(null);

export function CadastreProvider({ children }: { children: React.ReactNode }) {
  const cadastre = useCadastre();
  return (
    <CadastreContext.Provider value={cadastre}>
      {children}
    </CadastreContext.Provider>
  );
}

export function useCadastreContext(): CadastreContextType {
  const ctx = useContext(CadastreContext);
  if (!ctx) {
    throw new Error("useCadastreContext must be used within a CadastreProvider");
  }
  return ctx;
}
