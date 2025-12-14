"use client";

import { Info } from "lucide-react";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Modal } from "@/components/ui/modal";

const shortcuts = [
  { key: "F", description: "Focus on model" },
  { key: "S", description: "Toggle shadows" },
  { key: "T", description: "Toggle grid" },
  { key: "R", description: "Reset camera" },
  { key: "Space", description: "Play animation" },
];

export function ViewportShortcuts() {
  return (
    <div className="absolute bottom-4 left-4 glass-panel p-2 rounded-lg z-10">
      <Modal
        trigger={
          <SpectacularButton variant="ghost" size="sm" className="w-full">
            <Info className="w-4 h-4 mr-2" />
            Shortcuts
          </SpectacularButton>
        }
        title="Keyboard Shortcuts"
      >
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 rounded bg-glass-bg border border-glass-border text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
