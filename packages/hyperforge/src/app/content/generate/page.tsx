"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NPCContentGenerator } from "@/components/content/NPCContentGenerator";
import { QuestGenerator } from "@/components/content/QuestGenerator";
import { AreaGenerator } from "@/components/content/AreaGenerator";
import { ItemGenerator } from "@/components/content/ItemGenerator";
import { Users, Scroll, Map as MapIcon, Sword } from "lucide-react";
import { StudioPageLayout } from "@/components/layout/StudioPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { GeneratedNPCContent } from "@/types/game/dialogue-types";
import type {
  GeneratedQuestContent,
  GeneratedAreaContent,
  GeneratedItemContent,
} from "@/types/game/content-types";

type ContentTab = "npc" | "quest" | "area" | "item";

export default function ContentStudioPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>("npc");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["npc", "quest", "area", "item"].includes(tabParam)) {
      setActiveTab(tabParam as ContentTab);
    }
  }, [searchParams]);

  const handleNPCGenerated = (_content: GeneratedNPCContent) => {
    // Content saved via API, will appear in library
  };

  const handleQuestGenerated = (_content: GeneratedQuestContent) => {
    // Content saved via API, will appear in library
  };

  const handleAreaGenerated = (_content: GeneratedAreaContent) => {
    // Content saved via API, will appear in library
  };

  const handleItemGenerated = (_content: GeneratedItemContent) => {
    // Content saved via API, will appear in library
  };

  if (!mounted) {
    return (
      <StudioPageLayout
        title="Content Studio"
        description="Generate game content with AI"
        showVault={false}
      >
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </StudioPageLayout>
    );
  }

  return (
    <StudioPageLayout
      title="Content Studio"
      description="Generate game content with AI"
      showVault={false}
    >
      <div className="h-full flex">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Content Studio</h1>
              <p className="text-muted-foreground">
                Generate NPCs, quests, areas, and items with AI-powered content
                creation.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">NPCs</h3>
                <p className="text-xs text-muted-foreground">
                  Characters with personalities, dialogue, and backstories.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3">
                  <Scroll className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">Quests</h3>
                <p className="text-xs text-muted-foreground">
                  Objectives, rewards, and branching storylines.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3">
                  <MapIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">Areas</h3>
                <p className="text-xs text-muted-foreground">
                  Locations, environments, and points of interest.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3">
                  <Sword className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">Items</h3>
                <p className="text-xs text-muted-foreground">
                  Weapons, armor, consumables, and loot.
                </p>
              </div>
            </div>

            {/* Content Studio Panel */}
            <div className="rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm overflow-hidden p-6">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as ContentTab)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="npc" className="text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    NPCs
                  </TabsTrigger>
                  <TabsTrigger value="quest" className="text-sm">
                    <Scroll className="w-4 h-4 mr-2" />
                    Quests
                  </TabsTrigger>
                  <TabsTrigger value="area" className="text-sm">
                    <MapIcon className="w-4 h-4 mr-2" />
                    Areas
                  </TabsTrigger>
                  <TabsTrigger value="item" className="text-sm">
                    <Sword className="w-4 h-4 mr-2" />
                    Items
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="npc">
                  <NPCContentGenerator onContentGenerated={handleNPCGenerated} />
                </TabsContent>

                <TabsContent value="quest">
                  <QuestGenerator onContentGenerated={handleQuestGenerated} />
                </TabsContent>

                <TabsContent value="area">
                  <AreaGenerator onContentGenerated={handleAreaGenerated} />
                </TabsContent>

                <TabsContent value="item">
                  <ItemGenerator onContentGenerated={handleItemGenerated} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </StudioPageLayout>
  );
}
