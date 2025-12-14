"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NPCContentGenerator } from "@/components/content/NPCContentGenerator";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  Users,
  Scroll,
  Map,
  Sword,
  Cuboid,
  MessageSquare,
  Settings,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import type { GeneratedNPCContent } from "@/types/game/dialogue-types";

const mainNavItems = [
  {
    href: "/",
    label: "3D Assets",
    icon: Cuboid,
    description: "Generate 3D models",
  },
  {
    href: "/content",
    label: "Content",
    icon: MessageSquare,
    description: "NPC dialogues & lore",
  },
];

type ContentTab = "npc" | "quest" | "area" | "item";

export default function ContentGenerationPage() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<ContentTab>("npc");
  const [generatedContent, setGeneratedContent] = useState<
    GeneratedNPCContent[]
  >([]);

  const contentTabs = [
    { id: "npc" as const, label: "NPCs", icon: Users },
    { id: "quest" as const, label: "Quests", icon: Scroll, disabled: true },
    { id: "area" as const, label: "Areas", icon: Map, disabled: true },
    { id: "item" as const, label: "Items", icon: Sword, disabled: true },
  ];

  const handleNPCGenerated = (content: GeneratedNPCContent) => {
    setGeneratedContent((prev) => [content, ...prev]);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Side Navigation */}
      <aside className="w-64 border-r border-glass-border bg-glass-bg/30 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">HyperForge</h1>
              <p className="text-xs text-muted-foreground">AI Asset Studio</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="p-3 space-y-1 border-b border-glass-border">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-glass-bg"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Content Type Tabs */}
        <div className="flex-1 p-3 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-3 py-2">
            Content Types
          </p>
          {contentTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                transition-all duration-200
                ${
                  activeTab === tab.id
                    ? "bg-secondary/50 text-foreground"
                    : tab.disabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-glass-bg"
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
              {tab.disabled && (
                <span className="ml-auto text-xs text-muted-foreground/50">
                  Soon
                </span>
              )}
            </button>
          ))}

          {/* Generated Content History */}
          {generatedContent.length > 0 && (
            <div className="mt-6 pt-4 border-t border-glass-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-3 py-2">
                Recent ({generatedContent.length})
              </p>
              <div className="space-y-1">
                {generatedContent.slice(0, 5).map((content) => (
                  <div
                    key={content.id}
                    className="px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-glass-bg"
                  >
                    <div className="font-medium truncate">{content.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {content.dialogue.nodes.length} nodes
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-glass-border">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-glass-bg transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-glass-border px-6 flex items-center bg-glass-bg/20">
          <h2 className="text-lg font-semibold">
            {activeTab === "npc" && "NPC Content Generator"}
            {activeTab === "quest" && "Quest Generator"}
            {activeTab === "area" && "Area Generator"}
            {activeTab === "item" && "Item Generator"}
          </h2>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "npc" && (
            <NPCContentGenerator onContentGenerated={handleNPCGenerated} />
          )}

          {activeTab === "quest" && (
            <div className="flex items-center justify-center h-full">
              <GlassPanel className="p-8 text-center max-w-md">
                <Scroll className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Quest Generator</h3>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Generate complete quest chains with objectives,
                  rewards, and dialogue.
                </p>
              </GlassPanel>
            </div>
          )}

          {activeTab === "area" && (
            <div className="flex items-center justify-center h-full">
              <GlassPanel className="p-8 text-center max-w-md">
                <Map className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Area Generator</h3>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Generate area descriptions, spawn tables, and
                  environmental details.
                </p>
              </GlassPanel>
            </div>
          )}

          {activeTab === "item" && (
            <div className="flex items-center justify-center h-full">
              <GlassPanel className="p-8 text-center max-w-md">
                <Sword className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Item Generator</h3>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Generate item stats, descriptions, and lore.
                </p>
              </GlassPanel>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
