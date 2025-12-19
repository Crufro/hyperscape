import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps
  extends ButtonHTMLAttributes<globalThis.HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "danger"
    | "default"
    | "outline"
    | "destructive";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

// Wrapping motion.button logic manually or using standard button for simplicity first
export const SpectacularButton = forwardRef<
  globalThis.HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      glow = true,
      children,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-accent/10 text-foreground border border-accent/50 hover:bg-accent/20 hover:border-accent font-semibold",
      secondary:
        "bg-glass-bg text-foreground border border-border hover:bg-foreground/10",
      ghost:
        "bg-transparent text-muted hover:text-foreground hover:bg-foreground/5",
      danger:
        "bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/20",
      // Aliases for shadcn-ui compatibility
      default:
        "bg-accent/10 text-foreground border border-accent/50 hover:bg-accent/20 hover:border-accent font-semibold",
      outline:
        "bg-transparent text-foreground border border-border hover:bg-foreground/10",
      destructive:
        "bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/20",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base font-medium",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          glow &&
            variant === "primary" &&
            "shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.5)]",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
SpectacularButton.displayName = "SpectacularButton";
