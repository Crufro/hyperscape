"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { GlassPanel } from "./glass-panel";
import { SpectacularButton } from "./spectacular-button";
import {
  AlertTriangle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Trash2,
  History,
  Wifi,
  FileWarning,
  Cog,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categorizeError,
  formatError,
  recordError,
  getErrorHistory,
  clearErrorHistory,
  type ErrorCategory,
} from "@/lib/errors/error-service";

// =============================================================================
// TYPES
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Context-specific recovery actions */
  recoveryActions?: RecoveryAction[];
  /** Show error history panel */
  showHistory?: boolean;
  /** Component context for better error messages */
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  showHistory: boolean;
}

export interface RecoveryAction {
  id: string;
  label: string;
  icon?: ReactNode;
  action: () => void | Promise<void>;
  /** When to show this action (based on error category) */
  forCategories?: ErrorCategory[];
}

// =============================================================================
// ERROR ICONS BY CATEGORY
// =============================================================================

const CATEGORY_ICONS: Record<ErrorCategory, ReactNode> = {
  network: <Wifi className="w-6 h-6" />,
  validation: <FileWarning className="w-6 h-6" />,
  generation: <Cog className="w-6 h-6" />,
  storage: <Database className="w-6 h-6" />,
  auth: <AlertTriangle className="w-6 h-6" />,
  unknown: <AlertTriangle className="w-6 h-6" />,
};

const CATEGORY_COLORS: Record<ErrorCategory, string> = {
  network: "bg-yellow-500/20 text-yellow-500",
  validation: "bg-orange-500/20 text-orange-500",
  generation: "bg-blue-500/20 text-blue-500",
  storage: "bg-purple-500/20 text-purple-500",
  auth: "bg-red-500/20 text-red-500",
  unknown: "bg-destructive/20 text-destructive",
};

// =============================================================================
// DEFAULT RECOVERY ACTIONS
// =============================================================================

const DEFAULT_RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: "reload-page",
    label: "Reload Page",
    icon: <RefreshCw className="w-4 h-4" />,
    action: () => window.location.reload(),
  },
];

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      showHistory: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Record error in history
    recordError(error, window.location.href);

    // Store error info for display
    this.setState({ errorInfo });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = [
      `Error: ${error?.message}`,
      `Stack: ${error?.stack}`,
      `Component Stack: ${errorInfo?.componentStack}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n\n");

    navigator.clipboard.writeText(errorText);
  };

  toggleDetails = () => {
    this.setState((state) => ({ showDetails: !state.showDetails }));
  };

  toggleHistory = () => {
    this.setState((state) => ({ showHistory: !state.showHistory }));
  };

  handleClearHistory = () => {
    clearErrorHistory();
    this.forceUpdate();
  };

  getRecoveryActions(): RecoveryAction[] {
    const { recoveryActions = [] } = this.props;
    const { error } = this.state;
    const category = error ? categorizeError(error) : "unknown";

    // Filter actions by category
    const filteredCustomActions = recoveryActions.filter(
      (action) => !action.forCategories || action.forCategories.includes(category)
    );

    return [...filteredCustomActions, ...DEFAULT_RECOVERY_ACTIONS];
  }

  override render() {
    const { hasError, error, errorInfo, showDetails, showHistory } = this.state;
    const { children, fallback, context } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    const category = error ? categorizeError(error) : "unknown";
    const formatted = error ? formatError(error) : null;
    const errorHistory = getErrorHistory();
    const iconColor = CATEGORY_COLORS[category];

    return (
      <GlassPanel
        intensity="high"
        className="p-6 flex flex-col items-center justify-center gap-4"
      >
        {/* Error Icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            iconColor
          )}
        >
          {CATEGORY_ICONS[category]}
        </div>

        {/* Error Message */}
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {formatted?.userMessage || "Something went wrong"}
          </h3>
          {context && (
            <p className="text-xs text-muted-foreground mb-2">
              in {context}
            </p>
          )}
          <p className="text-sm text-muted">
            {error?.message || "An unexpected error occurred"}
          </p>
          {formatted?.isRetryable && (
            <p className="text-xs text-muted-foreground mt-2">
              This error may be temporary. Try again in a moment.
            </p>
          )}
        </div>

        {/* Recovery Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          {this.getRecoveryActions().map((action) => (
            <SpectacularButton
              key={action.id}
              variant="secondary"
              size="sm"
              onClick={() => {
                action.action();
                if (action.id === "reload-page") return;
                this.handleRetry();
              }}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </SpectacularButton>
          ))}
        </div>

        {/* Utility Buttons */}
        <div className="flex gap-2">
          <button
            onClick={this.toggleDetails}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
          <button
            onClick={this.handleCopyError}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            title="Copy error to clipboard"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
          {this.props.showHistory && errorHistory.length > 0 && (
            <button
              onClick={this.toggleHistory}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <History className="w-3 h-3" />
              History ({errorHistory.length})
            </button>
          )}
        </div>

        {/* Error Details */}
        {showDetails && (
          <div className="w-full max-w-lg mt-2 p-3 bg-glass-bg/50 rounded-lg border border-glass-border text-xs font-mono overflow-auto max-h-48">
            <div className="text-muted-foreground mb-2">
              <strong>Category:</strong> {category}
              <br />
              <strong>Code:</strong> {formatted?.code || "UNKNOWN"}
              <br />
              <strong>Retryable:</strong> {formatted?.isRetryable ? "Yes" : "No"}
            </div>
            <div className="text-destructive/80 whitespace-pre-wrap">
              {error?.stack || error?.message}
            </div>
            {errorInfo?.componentStack && (
              <div className="mt-2 pt-2 border-t border-glass-border text-muted-foreground whitespace-pre-wrap">
                <strong>Component Stack:</strong>
                {errorInfo.componentStack}
              </div>
            )}
          </div>
        )}

        {/* Error History */}
        {showHistory && errorHistory.length > 0 && (
          <div className="w-full max-w-lg mt-2 p-3 bg-glass-bg/50 rounded-lg border border-glass-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Recent Errors</span>
              <button
                onClick={this.handleClearHistory}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              {errorHistory.slice(0, 5).map((entry, i) => (
                <div
                  key={i}
                  className="text-xs p-2 bg-glass-bg rounded border border-glass-border"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium truncate flex-1">
                      {entry.error.message}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] ml-2",
                        CATEGORY_COLORS[entry.error.category]
                      )}
                    >
                      {entry.error.category}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    );
  }
}

// =============================================================================
// FUNCTIONAL WRAPPER (for hooks usage)
// =============================================================================

interface ErrorBoundaryWrapperProps extends Omit<ErrorBoundaryProps, "recoveryActions"> {
  recoveryActions?: RecoveryAction[];
}

/**
 * Functional wrapper for ErrorBoundary that allows using hooks
 */
export function WithErrorBoundary({
  children,
  ...props
}: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
}
