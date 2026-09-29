import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { StharaSidebar, STHARA_NAV_GROUPS, isNavItemActive } from "./StharaSidebar";
import { Menu, Box, FileCode2, ArrowRight } from "lucide-react";

interface StharaAppShellProps {
  children: React.ReactNode;
}

export function StharaAppShell({ children }: StharaAppShellProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Compute active page title for header breadcrumb
  const activePageInfo = useMemo(() => {
    for (const group of STHARA_NAV_GROUPS) {
      for (const item of group.items) {
        if (isNavItemActive(location, item.path)) {
          return { title: item.label, path: item.path };
        }
      }
    }
    if (location.includes("/workspace")) {
      const params = new URLSearchParams(window.location.search);
      const segment = params.get("segment");
      if (segment === "map") return { title: "Map", path: "/workspace?segment=map" };
      if (segment === "3d") return { title: "3D Model", path: "/workspace?segment=3d" };
      if (segment === "buildings") return { title: "Buildings", path: "/workspace?segment=buildings" };
      return { title: "Spatial Workspace", path: "/workspace" };
    }
    return { title: "Overview", path: "/overview" };
  }, [location]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F3F0E8] text-[#252622] font-sans antialiased">
      {/* Left Sidebar */}
      <StharaSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        {/* Workspace Top Header Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#D7D4CB] bg-[#F8F6F0] px-4 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded border border-[#D7D4CB] bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB] lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Breadcrumb Path Context */}
            <div className="flex items-center gap-2 text-xs text-[#6F7069]">
              <Link href="/projects" className="font-medium text-[#252622] hover:underline">
                Rajouri Garden
              </Link>
              <span className="text-[#D7D4CB]">/</span>
              <span className="font-bold text-[#A85D48] tracking-wide">
                {activePageInfo.title}
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/drawing-intelligence"
              className="hidden sm:flex items-center gap-1.5 rounded border border-[#B28A52]/50 bg-[#B28A52]/10 px-2.5 py-1 text-xs font-semibold text-[#B28A52] transition-colors hover:bg-[#B28A52]/20"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span>Drawing Intel</span>
            </Link>

            <Link
              href="/workspace?segment=3d"
              className="flex items-center gap-1.5 rounded border border-[#A85D48]/40 bg-[#A85D48] px-3 py-1 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
            >
              <Box className="h-3.5 w-3.5" />
              <span>Launch 3D</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Main Workspace Content Container */}
        <main className="flex-1 overflow-y-auto min-h-0 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
