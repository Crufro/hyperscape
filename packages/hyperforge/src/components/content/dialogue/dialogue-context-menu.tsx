"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Star,
  Mic,
  MessageSquare,
  StopCircle,
  Maximize,
  LayoutGrid,
  Clipboard,
  Edit,
  Zap,
} from "lucide-react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export type ContextMenuType = "canvas" | "node" | "edge";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

interface DialogueContextMenuProps {
  isOpen: boolean;
  position: ContextMenuPosition;
  type: ContextMenuType;
  onClose: () => void;
  // Canvas actions
  onAddDialogueNode?: () => void;
  onAddEndNode?: () => void;
  onPaste?: () => void;
  onFitView?: () => void;
  onAutoLayout?: () => void;
  // Node actions
  onEditNode?: () => void;
  onDeleteNode?: () => void;
  onDuplicateNode?: () => void;
  onSetAsEntry?: () => void;
  onAddResponse?: () => void;
  onGenerateAudio?: () => void;
  isEntryNode?: boolean;
  // Edge actions
  onEditEdge?: () => void;
  onDeleteEdge?: () => void;
  onAddEffect?: () => void;
  hasEffect?: boolean;
}

export function DialogueContextMenu({
  isOpen,
  position,
  type,
  onClose,
  // Canvas
  onAddDialogueNode,
  onAddEndNode,
  onPaste,
  onFitView,
  onAutoLayout,
  // Node
  onEditNode,
  onDeleteNode,
  onDuplicateNode,
  onSetAsEntry,
  onAddResponse,
  onGenerateAudio,
  isEntryNode,
  // Edge
  onEditEdge,
  onDeleteEdge,
  onAddEffect,
  hasEffect,
}: DialogueContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Build menu items based on type
  const getMenuItems = useCallback((): MenuItem[] => {
    switch (type) {
      case "canvas":
        return [
          {
            label: "Add Dialogue Node",
            icon: <MessageSquare className="w-4 h-4" />,
            onClick: () => {
              onAddDialogueNode?.();
              onClose();
            },
          },
          {
            label: "Add End Node",
            icon: <StopCircle className="w-4 h-4" />,
            onClick: () => {
              onAddEndNode?.();
              onClose();
            },
          },
          {
            label: "Paste",
            icon: <Clipboard className="w-4 h-4" />,
            onClick: () => {
              onPaste?.();
              onClose();
            },
            divider: true,
          },
          {
            label: "Auto Layout",
            icon: <LayoutGrid className="w-4 h-4" />,
            onClick: () => {
              onAutoLayout?.();
              onClose();
            },
          },
          {
            label: "Fit View",
            icon: <Maximize className="w-4 h-4" />,
            onClick: () => {
              onFitView?.();
              onClose();
            },
          },
        ];

      case "node":
        return [
          {
            label: "Edit Node",
            icon: <Edit className="w-4 h-4" />,
            onClick: () => {
              onEditNode?.();
              onClose();
            },
          },
          {
            label: "Duplicate",
            icon: <Copy className="w-4 h-4" />,
            onClick: () => {
              onDuplicateNode?.();
              onClose();
            },
          },
          {
            label: "Add Response",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => {
              onAddResponse?.();
              onClose();
            },
            divider: true,
          },
          {
            label: "Set as Entry",
            icon: <Star className="w-4 h-4" />,
            onClick: () => {
              onSetAsEntry?.();
              onClose();
            },
            disabled: isEntryNode,
          },
          {
            label: "Generate Audio",
            icon: <Mic className="w-4 h-4" />,
            onClick: () => {
              onGenerateAudio?.();
              onClose();
            },
            divider: true,
          },
          {
            label: "Delete Node",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => {
              onDeleteNode?.();
              onClose();
            },
            danger: true,
            disabled: isEntryNode,
          },
        ];

      case "edge":
        return [
          {
            label: "Edit Response",
            icon: <Edit className="w-4 h-4" />,
            onClick: () => {
              onEditEdge?.();
              onClose();
            },
          },
          {
            label: hasEffect ? "Edit Effect" : "Add Effect",
            icon: <Zap className="w-4 h-4" />,
            onClick: () => {
              onAddEffect?.();
              onClose();
            },
            divider: true,
          },
          {
            label: "Delete Connection",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => {
              onDeleteEdge?.();
              onClose();
            },
            danger: true,
          },
        ];

      default:
        return [];
    }
  }, [
    type,
    onAddDialogueNode,
    onAddEndNode,
    onPaste,
    onFitView,
    onAutoLayout,
    onEditNode,
    onDeleteNode,
    onDuplicateNode,
    onSetAsEntry,
    onAddResponse,
    onGenerateAudio,
    isEntryNode,
    onEditEdge,
    onDeleteEdge,
    onAddEffect,
    hasEffect,
    onClose,
  ]);

  if (!isOpen) return null;

  const menuItems = getMenuItems();

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - menuItems.length * 40 - 20),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] py-1.5 bg-glass-bg/95 backdrop-blur-md rounded-xl border border-glass-border shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {menuItems.map((item, index) => (
        <div key={index}>
          <button
            onClick={item.onClick}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
              transition-colors duration-150
              ${
                item.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-foreground hover:bg-foreground/10"
              }
            `}
          >
            <span
              className={item.danger ? "text-red-400" : "text-muted-foreground"}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
          {item.divider && <div className="my-1 h-px bg-glass-border" />}
        </div>
      ))}
    </div>
  );
}
