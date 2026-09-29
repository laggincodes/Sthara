import { Link, useLocation } from "wouter";
import {
  Layers,
  Map,
  Box,
  Building2,
  Layers3,
  FileCode2,
  Compass,
  Ruler,
  FileSpreadsheet,
  QrCode,
  Download,
  BarChart3,
  FolderKanban,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
};

export const STHARA_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", path: "/overview", icon: BarChart3 },
  { id: "projects", label: "Projects", path: "/projects", icon: FolderKanban },
  { id: "map", label: "Map", path: "/workspace?segment=map", icon: Map },
  { id: "3d", label: "3D Model", path: "/workspace?segment=3d", icon: Box },
  { id: "buildings", label: "Buildings", path: "/workspace?segment=buildings", icon: Building2 },
  { id: "floors", label: "Floors & Units", path: "/floor-explorer", icon: Layers3 },
  { id: "drawings", label: "Drawing Intelligence", path: "/drawing-intelligence", icon: FileCode2 },
  { id: "analysis", label: "Spatial Analysis", path: "/spatial-analysis", icon: Compass },
  { id: "measurements", label: "Measurements", path: "/measurements", icon: Ruler },
  { id: "sources", label: "Sources", path: "/sources", icon: FileSpreadsheet },
  { id: "spatial-ids", label: "Spatial IDs", path: "/spatial-ids", icon: QrCode },
  { id: "exports", label: "Exports", path: "/exports", icon: Download },
];

export function StharaNavigation() {
  return null;
}
