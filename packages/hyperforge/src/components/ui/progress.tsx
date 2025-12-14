"use client";

import { forwardRef, HTMLAttributes, SVGAttributes } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Linear Progress
// ============================================================================
export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = "primary",
      size = "md",
      showLabel = false,
      animated = false,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variants = {
      primary: "bg-neon-blue",
      success: "bg-neon-green",
      warning: "bg-accent",
      error: "bg-destructive",
    };

    const sizes = {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    };

    return (
      <div className={cn("space-y-1", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          ref={ref}
          className={cn(
            "w-full bg-glass-bg rounded-full overflow-hidden border border-glass-border",
            sizes[size],
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out rounded-full",
              variants[variant],
              animated && "animate-pulse",
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  },
);
Progress.displayName = "Progress";

// ============================================================================
// Circular Progress
// ============================================================================
export interface CircularProgressProps extends SVGAttributes<SVGSVGElement> {
  value?: number;
  size?: number;
  strokeWidth?: number;
  variant?: "primary" | "success" | "warning" | "error";
  showLabel?: boolean;
  indeterminate?: boolean;
}

const CircularProgress = forwardRef<SVGSVGElement, CircularProgressProps>(
  (
    {
      className,
      value = 0,
      size = 48,
      strokeWidth = 4,
      variant = "primary",
      showLabel = false,
      indeterminate = false,
      ...props
    },
    ref,
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = indeterminate
      ? circumference * 0.75
      : circumference - (value / 100) * circumference;

    const colors = {
      primary: "text-neon-blue",
      success: "text-neon-green",
      warning: "text-accent",
      error: "text-destructive",
    };

    return (
      <div className={cn("relative inline-flex", className)}>
        <svg
          ref={ref}
          className={cn(colors[variant], indeterminate && "animate-spin")}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          {...props}
        >
          <circle
            className="text-glass-bg"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={cn(
              "transition-all duration-300 ease-out",
              indeterminate && "animate-[dash_1.5s_ease-in-out_infinite]",
            )}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        {showLabel && !indeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-foreground">
              {Math.round(value)}%
            </span>
          </div>
        )}
      </div>
    );
  },
);
CircularProgress.displayName = "CircularProgress";

export { Progress, CircularProgress };
