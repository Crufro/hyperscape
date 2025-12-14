import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "outline";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
    secondary: "bg-glass-bg text-foreground border-glass-border",
    success: "bg-neon-green/10 text-neon-green border-neon-green/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    destructive: "bg-red-500/10 text-red-500 border-red-500/20",
    outline: "bg-transparent border-border text-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
