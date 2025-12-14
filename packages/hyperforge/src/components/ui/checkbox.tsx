"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      indeterminate = false,
      size = "md",
      label,
      checked,
      disabled,
      onCheckedChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const sizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const iconSizes = {
      sm: "w-3 h-3",
      md: "w-3.5 h-3.5",
      lg: "w-4 h-4",
    };

    const isChecked = checked || indeterminate;

    return (
      <label
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            disabled={disabled}
            className="sr-only peer"
            onChange={(e) => {
              onChange?.(e);
              onCheckedChange?.(e.target.checked);
            }}
            {...props}
          />
          <div
            className={cn(
              "rounded border-2 transition-all duration-200 flex items-center justify-center",
              sizes[size],
              isChecked
                ? "bg-accent border-accent"
                : "bg-glass-bg border-glass-border",
              !disabled && !isChecked && "hover:border-accent/50",
              "peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 peer-focus:ring-offset-background",
            )}
          >
            {indeterminate ? (
              <Minus className={cn(iconSizes[size], "text-foreground")} />
            ) : checked ? (
              <Check className={cn(iconSizes[size], "text-foreground")} />
            ) : null}
          </div>
        </div>
        {label && (
          <span className="text-sm text-foreground select-none">{label}</span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
