"use client";

import { ReactNode, useEffect } from "react";
import { GlassPanel } from "./glass-panel";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "small" | "medium" | "large" | "full";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "medium",
}: ModalProps) {
  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-lg",
    large: "max-w-4xl",
    full: "max-w-7xl",
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`relative z-10 w-full ${sizeClasses[size]}`}
          >
            <GlassPanel intensity="high" className="flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 id="modal-title" className="text-lg font-bold text-foreground tracking-wide">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1 text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex justify-end gap-3 p-4 border-t border-border bg-glass-bg/50">
                  {footer}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
