"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { GlassPanel } from "./glass-panel";
import { SpectacularButton } from "./spectacular-button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <GlassPanel
          intensity="high"
          className="p-6 flex flex-col items-center justify-center gap-4 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Something went wrong
            </h3>
            <p className="text-sm text-muted max-w-md">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          <SpectacularButton
            variant="secondary"
            size="sm"
            onClick={this.handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </SpectacularButton>
        </GlassPanel>
      );
    }

    return this.props.children;
  }
}
