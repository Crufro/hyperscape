"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import {
  Shirt,
  Sword,
  Shield,
  Crown,
  Footprints,
  Hand,
  Eye,
  RotateCcw,
  Save,
} from "lucide-react";
import type { AssetData } from "@/types/asset";

interface CharacterEquipmentPanelProps {
  selectedAsset?: AssetData | null;
}

const equipmentSlots = [
  { id: "head", label: "Head", icon: Crown },
  { id: "chest", label: "Chest", icon: Shirt },
  { id: "hands", label: "Hands", icon: Hand },
  { id: "legs", label: "Legs", icon: Footprints },
  { id: "main-hand", label: "Main Hand", icon: Sword },
  { id: "off-hand", label: "Off Hand", icon: Shield },
];

export function CharacterEquipmentPanel({
  selectedAsset,
}: CharacterEquipmentPanelProps) {
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [equippedItems, setEquippedItems] = useState<
    Record<string, AssetData | null>
  >({});

  const handleEquip = (slotId: string, item: AssetData | null) => {
    setEquippedItems((prev) => ({ ...prev, [slotId]: item }));
  };

  const handleClearAll = () => {
    setEquippedItems({});
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Character Equipment</h2>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Equip items on your character model
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="slots" className="w-full">
          <div className="p-4 border-b border-glass-border">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="slots">Equipment Slots</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="slots" className="mt-0 p-4 space-y-3">
            {/* Character Selection */}
            <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Base Character
              </div>
              {selectedAsset ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-glass-bg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {selectedAsset.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedAsset.category}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a character from the vault
                </p>
              )}
            </div>

            {/* Equipment Slots */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Equipment Slots
              </div>
              {equipmentSlots.map((slot) => {
                const equipped = equippedItems[slot.id];
                const isActive = activeSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setActiveSlot(isActive ? null : slot.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${
                        isActive
                          ? "border-cyan-500/50 bg-cyan-500/10"
                          : "border-glass-border bg-glass-bg/30 hover:bg-glass-bg/50"
                      }
                    `}
                  >
                    <slot.icon
                      className={`w-5 h-5 ${equipped ? "text-cyan-400" : "text-muted-foreground"}`}
                    />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{slot.label}</div>
                      {equipped ? (
                        <div className="text-xs text-cyan-400">
                          {equipped.name}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Empty
                        </div>
                      )}
                    </div>
                    {equipped && (
                      <Badge variant="secondary" className="text-xs">
                        Equipped
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Slot Panel */}
            {activeSlot && (
              <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  {equipmentSlots.find((s) => s.id === activeSlot)?.label} Slot
                </div>
                <p className="text-sm text-muted-foreground">
                  Drag an item from the vault to equip it to this slot, or click
                  an item below.
                </p>
                <div className="flex gap-2">
                  <SpectacularButton
                    size="sm"
                    variant="outline"
                    onClick={() => handleEquip(activeSlot, null)}
                    disabled={!equippedItems[activeSlot]}
                  >
                    Unequip
                  </SpectacularButton>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-0 p-4 space-y-3">
            <div className="text-sm text-muted-foreground">
              Preview your equipped character in the 3D viewport.
            </div>

            {/* Equipment Summary */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Equipped Items
              </div>
              {Object.entries(equippedItems).filter(([, item]) => item).length >
              0 ? (
                Object.entries(equippedItems)
                  .filter(([, item]) => item)
                  .map(([slotId, item]) => (
                    <div
                      key={slotId}
                      className="flex items-center justify-between text-sm p-2 rounded bg-glass-bg/30"
                    >
                      <span className="text-muted-foreground capitalize">
                        {slotId.replace("-", " ")}
                      </span>
                      <span className="font-medium">{item?.name}</span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No items equipped
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-glass-border space-y-2">
        <SpectacularButton
          className="w-full"
          disabled={Object.keys(equippedItems).length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </SpectacularButton>
        <SpectacularButton
          className="w-full"
          variant="outline"
          onClick={handleClearAll}
          disabled={Object.keys(equippedItems).length === 0}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear All
        </SpectacularButton>
      </div>
    </div>
  );
}
