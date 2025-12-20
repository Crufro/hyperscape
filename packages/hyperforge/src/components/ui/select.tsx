"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { GlassPanel } from "./glass-panel";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  openUp?: boolean; // Open dropdown upward instead of downward
  className?: string;
  disabled?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  label,
  openUp = false,
  className,
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<globalThis.HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opening
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 240; // max-h-60 = 15rem = 240px

      // Check if dropdown would go off-screen at the bottom
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = openUp || spaceBelow < dropdownHeight;

      setDropdownPosition({
        top: shouldOpenUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [openUp]);

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Also update on scroll/resize
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
    return undefined;
  }, [isOpen, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Check if we should open up based on space
  const shouldOpenUp = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      return openUp || spaceBelow < dropdownHeight;
    }
    return openUp;
  }, [openUp]);

  return (
    <div
      className={cn("w-full flex flex-col gap-1.5", className)}
      ref={containerRef}
    >
      {label && (
        <label className="text-xs text-muted uppercase tracking-wider font-semibold ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex items-center justify-between w-full h-10 px-3 py-2 rounded-md border border-input bg-glass-bg/50 text-sm text-left transition-all",
            "focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50",
            isOpen && "border-neon-blue ring-1 ring-neon-blue/50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span
            className={
              !selectedOption ? "text-muted-foreground" : "text-foreground"
            }
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted transition-transform",
              isOpen && "transform rotate-180",
            )}
          />
        </button>

        {/* Render dropdown in a portal to escape overflow containers */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: shouldOpenUp() ? 8 : -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: shouldOpenUp() ? 8 : -8 }}
                  transition={{ duration: 0.15 }}
                  className="fixed z-[9999]"
                  style={{
                    top: shouldOpenUp() ? "auto" : dropdownPosition.top,
                    bottom: shouldOpenUp()
                      ? window.innerHeight - dropdownPosition.top + 4
                      : "auto",
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                  }}
                >
                  <GlassPanel
                    intensity="high"
                    className="py-1 max-h-60 overflow-auto custom-scrollbar"
                  >
                    {options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-foreground/10 transition-colors",
                          option.value === value
                            ? "text-neon-blue bg-neon-blue/5"
                            : "text-muted",
                        )}
                      >
                        {option.label}
                        {option.value === value && (
                          <Check className="w-4 h-4 text-neon-blue" />
                        )}
                      </button>
                    ))}
                  </GlassPanel>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </div>
    </div>
  );
}
