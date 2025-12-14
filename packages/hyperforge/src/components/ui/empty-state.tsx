import { GlassPanel } from "./glass-panel";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <GlassPanel
      intensity="low"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center border-dashed border-2 border-border bg-transparent",
        className,
      )}
    >
      <div className="p-4 rounded-full bg-foreground/5 mb-4 group hover:bg-foreground/10 transition-colors">
        <Icon className="w-8 h-8 text-muted group-hover:text-neon-blue transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-xs mb-6">{description}</p>
      {action}
    </GlassPanel>
  );
}
