"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 border border-slate-800 rounded-xl">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/40 text-red-400">
            <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {this.props.fallbackTitle || "Visual Component Encountered an Error"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed font-mono">
            {this.state.error?.message || "An unexpected rendering fault occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            Reset View & Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
