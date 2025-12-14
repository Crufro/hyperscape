import { GlassPanel } from "./glass-panel";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolNodeCardProps {
  title: string;
  description?: string;
  status: "idle" | "running" | "completed" | "failed";
  icon?: React.ReactNode;
  selected?: boolean;
}

export function ToolNodeCard({
  title,
  description,
  status,
  icon,
  selected,
}: ToolNodeCardProps) {
  return (
    <GlassPanel
      className={cn(
        "w-64 p-4 flex flex-col gap-3 transition-colors",
        selected && "border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.2)]",
        status === "running" && "border-neon-blue/50",
      )}
      intensity="medium"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-md bg-foreground/10 text-neon-blue">
            {icon}
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {status === "running" && (
          <Loader2 className="w-4 h-4 text-neon-blue animate-spin" />
        )}
        {status === "completed" && (
          <CheckCircle2 className="w-4 h-4 text-neon-green" />
        )}
        {status === "failed" && (
          <AlertCircle className="w-4 h-4 text-destructive" />
        )}
      </div>

      {description && (
        <p className="text-xs text-muted leading-relaxed">{description}</p>
      )}

      {/* Progress Bar (Mock) */}
      {status === "running" && (
        <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
          <div className="h-full bg-neon-blue w-1/2 animate-pulse" />
        </div>
      )}
    </GlassPanel>
  );
}
