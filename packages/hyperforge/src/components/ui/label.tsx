"use client";

import { cn } from "@/lib/utils";
import { LabelHTMLAttributes, forwardRef } from "react";

export type LabelProps = LabelHTMLAttributes<globalThis.HTMLLabelElement>;

export const Label = forwardRef<globalThis.HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        {...props}
      />
    );
  },
);

Label.displayName = "Label";
