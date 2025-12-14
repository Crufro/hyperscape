"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, resize = "vertical", ...props }, ref) => {
    const resizeClasses = {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x",
      both: "resize",
    };

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs text-muted uppercase tracking-wider font-semibold ml-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "min-h-[100px] w-full px-3 py-2 rounded-md border border-input bg-glass-bg/50 text-sm text-foreground placeholder:text-muted-foreground",
            "transition-all focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            resizeClasses[resize],
            error &&
              "border-destructive focus:border-destructive focus:ring-destructive/50",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive ml-1">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
