import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  FolderKanban,
  MapPin,
  Box,
  Building2,
  Layers3,
  FileCode2,
  Compass,
  Ruler,
  Database,
  QrCode,
  Download,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const STHARA_NAV_GROUPS: NavGroup[] = [
  {
    title: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", path: "/overview", icon: LayoutGrid },
      { id: "projects", label: "Projects", path: "/projects", icon: FolderKanban },
      { id: "map", label: "Map", path: "/workspace?segment=map", icon: MapPin },
      { id: "3d", label: "3D Model", path: "/workspace?segment=3d", icon: Box },
    ],
  },
  {
    title: "STRUCTURE",
    items: [
      { id: "buildings", label: "Buildings", path: "/workspace?segment=buildings", icon: Building2 },
      { id: "floors", label: "Floors & Units", path: "/floor-explorer", icon: Layers3 },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { id: "drawings", label: "Drawing Intelligence", path: "/drawing-intelligence", icon: FileCode2 },
      { id: "analysis", label: "Spatial Analysis", path: "/spatial-analysis", icon: Compass },
      { id: "measurements", label: "Measurements", path: "/measurements", icon: Ruler },
    ],
  },
  {
    title: "DATA",
    items: [
      { id: "sources", label: "Sources", path: "/sources", icon: Database },
      { id: "spatial-ids", label: "Spatial IDs", path: "/spatial-ids", icon: QrCode },
      { id: "exports", label: "Exports", path: "/exports", icon: Download },
    ],
  },
];

interface StharaSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function isNavItemActive(currentPath: string, itemPath: string): boolean {
  const currentUrl = window.location.pathname + window.location.search;
  
  if (itemPath === "/overview" && (currentPath === "/" || currentPath === "/overview")) {
    return true;
  }
  if (itemPath.includes("?")) {
    const [base, query] = itemPath.split("?");
    return currentPath === base && currentUrl.includes(query);
  }
  return currentPath === itemPath && !currentUrl.includes("?");
}

export function StharaSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: StharaSidebarProps) {
  const [location] = useLocation();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#E9E5DA] text-[#252622]">
      {/* Brand Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#D7D4CB] px-3.5">
        <Link href="/overview" className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-85">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#A85D48]/40 bg-[#A85D48] text-white shadow-xs">
            <Box className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-mono text-sm font-bold tracking-widest text-[#252622]">
                STHARA
              </span>
              <span className="truncate text-[10px] font-medium text-[#6F7069]">
                3D Spatial Intelligence
              </span>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="flex h-7 w-7 items-center justify-center rounded text-[#6F7069] hover:bg-[#D7D4CB]/50 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Project Selector */}
      {!isCollapsed ? (
        <div className="border-b border-[#D7D4CB] p-2.5">
          <div
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="group flex cursor-pointer items-center justify-between rounded-md border border-[#D7D4CB] bg-[#F8F6F0] p-2 transition-colors hover:border-[#A85D48]/40 shadow-2xs"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#788575] animate-pulse" />
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#6F7069]">
                  ACTIVE PROJECT
                </span>
                <span className="truncate text-xs font-bold text-[#252622]">
                  Rajouri Garden
                </span>
                <span className="text-[10px] text-[#6F7069]">Delhi · 3D Cadastre</span>
              </div>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#6F7069] transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
          </div>

          {isProjectDropdownOpen && (
            <div className="mt-1.5 rounded-md border border-[#D7D4CB] bg-[#F8F6F0] p-1 shadow-sm animate-in fade-in duration-100">
              <Link
                href="/projects"
                onClick={() => setIsProjectDropdownOpen(false)}
                className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-[#252622] hover:bg-[#E9E5DA]"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">Rajouri Garden</span>
                  <span className="text-[10px] text-[#6F7069]">Delhi (Active Dataset)</span>
                </div>
                <span className="rounded bg-[#788575]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#788575]">Active</span>
              </Link>
              <div className="my-1 border-t border-[#D7D4CB]" />
              <Link
                href="/projects"
                onClick={() => setIsProjectDropdownOpen(false)}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[#A85D48] hover:bg-[#E9E5DA]"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Switch / View All Projects</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center border-b border-[#D7D4CB] py-2.5">
          <Link
            href="/projects"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D7D4CB] bg-[#F8F6F0] text-[#788575] hover:border-[#A85D48]/40 shadow-2xs"
            title="Active Project: Rajouri Garden, Delhi"
          >
            <span className="h-2 w-2 rounded-full bg-[#788575]" />
          </Link>
        </div>
      )}

      {/* Nav Groups Container */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {STHARA_NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#6F7069]">
                {group.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(location, item.path);

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => onCloseMobile()}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center rounded-md py-2 text-xs transition-all ${
                      isCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
                    } ${
                      active
                        ? "bg-[#F8F6F0] font-semibold text-[#A85D48] shadow-2xs"
                        : "text-[#252622]/85 hover:bg-[#F8F6F0]/60 hover:text-[#252622]"
                    }`}
                  >
                    {/* Restrained primary vertical accent indicator */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-md bg-[#A85D48]" />
                    )}

                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? "text-[#A85D48]"
                          : "text-[#6F7069] group-hover:text-[#252622]"
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="truncate text-xs">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="ml-auto rounded bg-[#A85D48]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#A85D48]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer & Desktop Collapse Trigger */}
      <div className="border-t border-[#D7D4CB] p-2.5">
        {!isCollapsed && (
          <div className="mb-2 flex items-center justify-between rounded bg-[#F8F6F0] px-2.5 py-1.5 text-[10px] text-[#6F7069]">
            <span className="flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-[#788575]" />
              CORS ±1.8 cm
            </span>
            <span className="font-semibold text-[#252622]">EPSG:4326</span>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden w-full items-center justify-center gap-2 rounded-md border border-[#D7D4CB] bg-[#F8F6F0] py-1.5 text-xs text-[#6F7069] transition-colors hover:bg-[#E9E5DA] hover:text-[#252622] lg:flex"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-[#D7D4CB] transition-all duration-200 lg:block ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Off-canvas Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Mobile Off-canvas Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[#D7D4CB] transition-transform duration-200 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
