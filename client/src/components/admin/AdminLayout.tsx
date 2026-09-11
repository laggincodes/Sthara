import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatRole } from "@shared/permissions";
import {
  Building2,
  FileCheck2,
  FolderTree,
  Globe2,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/authorities", label: "Authority Roster", icon: ShieldCheck },
  { href: "/admin/departments", label: "Departments & Districts", icon: FolderTree },
  { href: "/admin/roles", label: "Roles & Permissions", icon: Shield },
  { href: "/floor-explorer", label: "3D Floor Cadastre", icon: Layers },
  { href: "/workspace", label: "3D GIS Explorer", icon: Globe2 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
  { href: "/admin/settings", label: "System Settings", icon: Sliders },
];

export function AdminLayout({
  children,
  title,
  subtitle,
  actionButton,
}: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/80 bg-slate-900/95 backdrop-blur transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6">
          <Link href="/overview" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">
                3D ULPIN · ADMIN
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-cyan-400">
                GOVT OF INDIA · DoLR
              </div>
            </div>
          </Link>
          <button
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Pill */}
        <div className="m-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-300">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "SA"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">
                {user?.name || user?.email || "Super Administrator"}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {formatRole(user?.role)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/10 font-semibold text-cyan-400 border border-cyan-500/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <Icon size={18} className={isActive ? "text-cyan-400" : "text-slate-500"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800/80 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:bg-red-500/10 hover:text-red-400"
            onClick={() => void logout()}
          >
            <LogOut size={18} className="mr-3" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-xs text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actionButton}
            <Link href="/overview">
              <Button variant="outline" size="sm" className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800">
                Public Portal
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
