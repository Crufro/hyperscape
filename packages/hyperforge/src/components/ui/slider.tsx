"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min: number;
  max: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

// Simple custom slider since we don't have Radix UI installed yet
// For production polish, we might want to install @radix-ui/react-slider eventually
export function Slider({
  value: controlledValue,
  defaultValue,
  min,
  max,
  step = 1,
  onValueChange,
  className,
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? [min],
  );
  const value = controlledValue ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const newValues = [newValue];
    if (!controlledValue) {
      setInternalValue(newValues);
    }
    onValueChange?.(newValues);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full h-5 flex items-center", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="absolute w-full h-1 bg-transparent appearance-none cursor-pointer z-20"
      />

      {/* Track Background */}
      <div className="absolute w-full h-1 bg-foreground/10 rounded-full overflow-hidden z-10">
        {/* Fill */}
        <div
          className="h-full bg-neon-blue transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb visual (purely decorative, follows input thumb via CSS usually, 
          but hard to sync perfectly without JS or Radix. 
          For now, relying on standard input thumb styling or simpler implementation) */}
      <div
        className="absolute h-4 w-4 bg-white rounded-full shadow-[0_0_10px_#00f3ff] pointer-events-none z-30 transition-all border border-neon-blue"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}
