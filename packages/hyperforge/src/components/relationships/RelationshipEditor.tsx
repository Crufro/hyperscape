"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Trash2,
  Link,
  Unlink,
  ArrowRight,
  ArrowLeft,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { logger } from "@/lib/utils";
import type { AssetCategory } from "@/types/core";
import {
  type RelationshipType,
  type AssetRelationship,
  type RelationshipMetadata,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_COLORS,
  ASSET_CATEGORY_COLORS,
  getValidRelationshipTypes,
  getValidTargetCategories,
  isValidRelationship,
} from "@/lib/relationships/relationship-types";

const log = logger.child("RelationshipEditor");

// =============================================================================
// TYPES
// =============================================================================

interface RelationshipEditorProps {
  assetId: string;
  assetName: string;
  assetCategory: AssetCategory;
  onRelationshipChange?: () => void;
  className?: string;
}

interface AssetOption {
  id: string;
  name: string;
  category: AssetCategory;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RelationshipEditor({
  assetId,
  assetName,
  assetCategory,
  onRelationshipChange,
  className = "",
}: RelationshipEditorProps) {
  const { toast } = useToast();

  // State
  const [outgoingRelationships, setOutgoingRelationships] = useState<AssetRelationship[]>([]);
  const [incomingRelationships, setIncomingRelationships] = useState<AssetRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    outgoing: true,
    incoming: true,
  });

  // Add form state
  const [newRelationship, setNewRelationship] = useState<{
    type: RelationshipType | "";
    targetId: string;
    targetName: string;
    targetCategory: AssetCategory | "";
  }>({
    type: "",
    targetId: "",
    targetName: "",
    targetCategory: "",
  });

  // Asset search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AssetOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // =============================================================================
  // FETCH RELATIONSHIPS
  // =============================================================================

  const fetchRelationships = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/relationships?assetId=${assetId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch relationships");
      }

      const data = await response.json();
      setOutgoingRelationships(data.outgoing || []);
      setIncomingRelationships(data.incoming || []);
    } catch (error) {
      log.error("Failed to fetch relationships", { error, assetId });
      toast({
        variant: "destructive",
        title: "Failed to load relationships",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [assetId, toast]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // =============================================================================
  // ASSET SEARCH
  // =============================================================================

  const searchAssets = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/relationships/search?q=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.assets || []);
      }
    } catch (error) {
      log.error("Asset search failed", { error });
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAssets(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchAssets]);

  // =============================================================================
  // VALID RELATIONSHIP TYPES
  // =============================================================================

  const validRelationshipTypes = useMemo(() => {
    if (!newRelationship.targetCategory) return [];
    return getValidRelationshipTypes(
      assetCategory,
      newRelationship.targetCategory,
    );
  }, [assetCategory, newRelationship.targetCategory]);

  // =============================================================================
  // ADD RELATIONSHIP
  // =============================================================================

  const handleAddRelationship = useCallback(async () => {
    if (
      !newRelationship.type ||
      !newRelationship.targetId ||
      !newRelationship.targetCategory
    ) {
      toast({
        variant: "destructive",
        title: "Invalid Relationship",
        description: "Please select a target asset and relationship type",
      });
      return;
    }

    if (
      !isValidRelationship(
        newRelationship.type,
        assetCategory,
        newRelationship.targetCategory,
      )
    ) {
      toast({
        variant: "destructive",
        title: "Invalid Relationship",
        description: `Cannot create "${newRelationship.type}" relationship from ${assetCategory} to ${newRelationship.targetCategory}`,
      });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: assetId,
          sourceType: assetCategory,
          sourceName: assetName,
          targetId: newRelationship.targetId,
          targetType: newRelationship.targetCategory,
          targetName: newRelationship.targetName,
          relationshipType: newRelationship.type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add relationship");
      }

      toast({
        variant: "success",
        title: "Relationship Added",
        description: `${assetName} now ${RELATIONSHIP_LABELS[newRelationship.type].verb} ${newRelationship.targetName}`,
      });

      // Reset form and refresh
      setNewRelationship({
        type: "",
        targetId: "",
        targetName: "",
        targetCategory: "",
      });
      setSearchQuery("");
      setShowAddForm(false);
      fetchRelationships();
      onRelationshipChange?.();
    } catch (error) {
      log.error("Failed to add relationship", { error });
      toast({
        variant: "destructive",
        title: "Failed to add relationship",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAdding(false);
    }
  }, [
    newRelationship,
    assetId,
    assetCategory,
    assetName,
    fetchRelationships,
    onRelationshipChange,
    toast,
  ]);

  // =============================================================================
  // REMOVE RELATIONSHIP
  // =============================================================================

  const handleRemoveRelationship = useCallback(
    async (relationshipId: string) => {
      try {
        const response = await fetch(`/api/relationships?id=${relationshipId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove relationship");
        }

        toast({
          variant: "success",
          title: "Relationship Removed",
        });

        fetchRelationships();
        onRelationshipChange?.();
      } catch (error) {
        log.error("Failed to remove relationship", { error });
        toast({
          variant: "destructive",
          title: "Failed to remove relationship",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [fetchRelationships, onRelationshipChange, toast],
  );

  // =============================================================================
  // SELECT ASSET FROM SEARCH
  // =============================================================================

  const selectAsset = useCallback((asset: AssetOption) => {
    setNewRelationship((prev) => ({
      ...prev,
      targetId: asset.id,
      targetName: asset.name,
      targetCategory: asset.category,
    }));
    setSearchQuery(asset.name);
    setSearchResults([]);
  }, []);

  // =============================================================================
  // RENDER RELATIONSHIP ITEM
  // =============================================================================

  const renderRelationship = useCallback(
    (rel: AssetRelationship, direction: "outgoing" | "incoming") => {
      const color = RELATIONSHIP_COLORS[rel.relationshipType];
      const isOutgoing = direction === "outgoing";
      const linkedAsset = isOutgoing
        ? { id: rel.targetId, name: rel.targetName, category: rel.targetType }
        : { id: rel.sourceId, name: rel.sourceName, category: rel.sourceType };
      const categoryColor = ASSET_CATEGORY_COLORS[linkedAsset.category];

      return (
        <div
          key={rel.id}
          className="flex items-center gap-2 p-2 rounded-lg bg-glass-bg/50 border border-glass-border/50 group hover:border-glass-border transition-colors"
        >
          {/* Direction Arrow */}
          {isOutgoing ? (
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}

          {/* Relationship Type Badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase flex-shrink-0"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {rel.relationshipType}
          </span>

          {/* Linked Asset */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="text-sm truncate">{linkedAsset.name}</span>
            <span className="text-[10px] text-muted-foreground">
              ({linkedAsset.category})
            </span>
          </div>

          {/* Metadata */}
          {rel.metadata?.chance !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {Math.round(rel.metadata.chance * 100)}%
            </span>
          )}

          {/* Delete Button */}
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={() => handleRemoveRelationship(rel.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </SpectacularButton>
        </div>
      );
    },
    [handleRemoveRelationship],
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <GlassPanel className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Relationships</h3>
        </div>
        <SpectacularButton
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </SpectacularButton>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Add Relationship Form */}
      {showAddForm && (
        <div className="space-y-3 p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
          <h4 className="text-sm font-medium">Add New Relationship</h4>

          {/* Asset Search */}
          <div className="space-y-1.5 relative">
            <Label className="text-xs">Target Asset</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <NeonInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-glass-bg border border-glass-border rounded-lg shadow-lg">
                {searchResults.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => selectAsset(asset)}
                    className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: ASSET_CATEGORY_COLORS[asset.category],
                      }}
                    />
                    <span className="text-sm">{asset.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {asset.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Asset Display */}
          {newRelationship.targetId && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    ASSET_CATEGORY_COLORS[
                      newRelationship.targetCategory as AssetCategory
                    ],
                }}
              />
              <span className="text-sm font-medium">
                {newRelationship.targetName}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({newRelationship.targetCategory})
              </span>
              <button
                onClick={() =>
                  setNewRelationship({
                    type: "",
                    targetId: "",
                    targetName: "",
                    targetCategory: "",
                  })
                }
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Relationship Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Relationship Type</Label>
            <Select
              value={newRelationship.type}
              onChange={(value) =>
                setNewRelationship((prev) => ({
                  ...prev,
                  type: value as RelationshipType,
                }))
              }
              options={[
                { value: "", label: "Select type..." },
                ...validRelationshipTypes.map((type) => ({
                  value: type,
                  label: `${assetName} ${RELATIONSHIP_LABELS[type].verb} ${newRelationship.targetName || "..."}`,
                })),
              ]}
              disabled={!newRelationship.targetCategory}
            />
            {newRelationship.targetCategory &&
              validRelationshipTypes.length === 0 && (
                <p className="text-xs text-yellow-500">
                  No valid relationship types between {assetCategory} and{" "}
                  {newRelationship.targetCategory}
                </p>
              )}
          </div>

          {/* Submit Button */}
          <SpectacularButton
            className="w-full"
            onClick={handleAddRelationship}
            disabled={
              isAdding ||
              !newRelationship.type ||
              !newRelationship.targetId
            }
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Add Relationship
              </>
            )}
          </SpectacularButton>
        </div>
      )}

      {/* Outgoing Relationships */}
      {!isLoading && (
        <div className="space-y-2">
          <button
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                outgoing: !prev.outgoing,
              }))
            }
            className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Outgoing ({outgoingRelationships.length})
            </span>
            {expandedSections.outgoing ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.outgoing && (
            <div className="space-y-1.5 ml-6">
              {outgoingRelationships.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No outgoing relationships
                </p>
              ) : (
                outgoingRelationships.map((rel) =>
                  renderRelationship(rel, "outgoing"),
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Incoming Relationships */}
      {!isLoading && (
        <div className="space-y-2">
          <button
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                incoming: !prev.incoming,
              }))
            }
            className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Incoming ({incomingRelationships.length})
            </span>
            {expandedSections.incoming ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.incoming && (
            <div className="space-y-1.5 ml-6">
              {incomingRelationships.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No incoming relationships
                </p>
              ) : (
                incomingRelationships.map((rel) =>
                  renderRelationship(rel, "incoming"),
                )
              )}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
