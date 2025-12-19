"use client";

import { DragEvent } from "react";
import { MessageSquare, StopCircle, GripVertical } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";

export type DraggableNodeType = "dialogue" | "end";

interface PaletteItem {
  type: DraggableNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const paletteItems: PaletteItem[] = [
  {
    type: "dialogue",
    label: "Dialogue Node",
    description: "NPC speech with responses",
    icon: <MessageSquare className="w-5 h-5" />,
    color: "from-primary/20 to-primary/5",
  },
  {
    type: "end",
    label: "End Node",
    description: "Terminate conversation",
    icon: <StopCircle className="w-5 h-5" />,
    color: "from-red-500/20 to-red-500/5",
  },
];

interface DialoguePaletteProps {
  className?: string;
}

export function DialoguePalette({ className }: DialoguePaletteProps) {
  const onDragStart = (
    event: DragEvent<HTMLDivElement>,
    nodeType: DraggableNodeType,
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <GlassPanel className={`p-3 space-y-2 ${className}`}>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Drag to Add
      </h4>

      {paletteItems.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          className={`
            flex items-center gap-3 p-2.5 rounded-lg cursor-grab
            bg-gradient-to-r ${item.color}
            border border-glass-border/50
            transition-all duration-200
            hover:scale-[1.02] hover:shadow-lg hover:border-primary/30
            active:scale-[0.98] active:cursor-grabbing
          `}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-glass-bg/50">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">
              {item.label}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {item.description}
            </div>
          </div>
          <GripVertical className="w-4 h-4 text-muted-foreground/50" />
        </div>
      ))}

      <div className="pt-2 mt-2 border-t border-glass-border/50">
        <p className="text-[10px] text-muted-foreground text-center">
          Drag nodes onto the canvas
        </p>
      </div>
    </GlassPanel>
  );
}
