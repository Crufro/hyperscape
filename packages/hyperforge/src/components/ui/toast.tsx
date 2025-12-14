"use client";

import * as React from "react";

// Toast constants removed as they were unused
// ToastType removed as unused

interface ToastActionElement {
  altText: string;
}

interface Toast extends ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
}

interface ToastProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  variant?: "default" | "destructive" | "success";
}

// Inspired by shadcn/ui toast implementation
// Simplified for our use case without full Radix dependency for now to keep it lightweight custom
import { createContext, useContext, useState } from "react";

type ToastContextType = {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ ...props }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);

    if (props.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, props.duration || 5000);
    }
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

import { GlassPanel } from "./glass-panel";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
          >
            <GlassPanel
              intensity="high"
              className={`p-4 flex items-start gap-3 shadow-lg border-l-4 ${
                t.variant === "destructive"
                  ? "border-l-red-500 bg-red-950/20"
                  : t.variant === "success"
                    ? "border-l-neon-green bg-green-950/20"
                    : "border-l-neon-blue"
              }`}
            >
              <div className="mt-0.5">
                {t.variant === "destructive" && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {t.variant === "success" && (
                  <CheckCircle className="w-5 h-5 text-neon-green" />
                )}
                {(!t.variant || t.variant === "default") && (
                  <Info className="w-5 h-5 text-neon-blue" />
                )}
              </div>
              <div className="grid gap-1 flex-1">
                {t.title && (
                  <h3 className="text-sm font-semibold text-foreground">
                    {t.title}
                  </h3>
                )}
                {t.description && (
                  <p className="text-xs text-muted">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </GlassPanel>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
