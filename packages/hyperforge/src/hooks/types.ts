/**
 * Shared Types for Hooks
 *
 * Common type definitions used across multiple hooks.
 */

import type { AssetCategory, AssetSource } from "@/types/core";

// =============================================================================
// ASYNC STATE
// =============================================================================

/**
 * Loading state for async hooks
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Async operation result
 */
export interface AsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// =============================================================================
// FILTER STATE
// =============================================================================

/**
 * Filter state for asset hooks
 */
export interface AssetFilters {
  category?: AssetCategory;
  search?: string;
  source?: AssetSource;
  rarity?: string;
  hasModel?: boolean;
  sortBy?: "name" | "createdAt" | "updatedAt" | "category";
  sortOrder?: "asc" | "desc";
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// CONNECTION STATE
// =============================================================================

/**
 * Connection state for server hooks
 */
export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  serverUrl: string;
  lastUpdate: number;
}

// =============================================================================
// SELECTION STATE
// =============================================================================

/**
 * Selection state for list hooks
 */
export interface SelectionState<T = string> {
  selectedId: T | null;
  selectedIds: Set<T>;
  select: (id: T | null) => void;
  toggleSelection: (id: T) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

// =============================================================================
// CACHE STATE
// =============================================================================

/**
 * Cache metadata for data hooks
 */
export interface CacheState {
  loadedAt: number | null;
  isValid: boolean;
  ttl: number;
}

// =============================================================================
// HOOK OPTIONS
// =============================================================================

/**
 * Common options for data fetching hooks
 */
export interface FetchHookOptions {
  /** Skip cache and force refresh */
  forceRefresh?: boolean;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Polling interval in ms (0 = disabled) */
  pollInterval?: number;
}

/**
 * Options for paginated hooks
 */
export interface PaginatedHookOptions extends FetchHookOptions {
  page?: number;
  pageSize?: number;
}

// =============================================================================
// HOOK RESULTS
// =============================================================================

/**
 * Result type for list hooks
 */
export interface ListHookResult<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Result type for single-item hooks
 */
export interface ItemHookResult<T> {
  item: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Result type for mutation hooks
 */
export interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}
