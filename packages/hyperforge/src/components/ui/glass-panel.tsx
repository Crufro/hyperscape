import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: "low" | "medium" | "high";
  border?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    { className, children, intensity = "medium", border = true, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-glass-bg backdrop-blur-md rounded-xl transition-all duration-300",
          border && "border border-glass-border",
          intensity === "low" && "bg-opacity-5 backdrop-blur-sm",
          intensity === "high" && "bg-opacity-20 backdrop-blur-lg shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
GlassPanel.displayName = "GlassPanel";
