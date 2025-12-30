/**
 * FollowManager
 *
 * Server-authoritative system for tracking players following other players.
 * Implements OSRS-accurate following behavior.
 *
 * OSRS-style behavior (from wiki):
 * 1. Player right-clicks another player and selects "Follow"
 * 2. Follower walks behind the leader (not on same tile)
 * 3. When leader moves, follower re-paths to stay behind them
 * 4. Following continues indefinitely until cancelled
 * 5. Cancelled by: clicking to walk, trading, equipping items, target disconnecting
 *
 * @see https://runescape.wiki/w/Follow
 */

import type { World } from "@hyperscape/shared";
import { worldToTile, tilesEqual, tileToWorld } from "@hyperscape/shared";
import type { TileMovementManager } from "./tile-movement";

interface FollowState {
  followerId: string;
  targetId: string;
  /** Last tile we pathed toward (to detect when target moves) */
  lastTargetTile: { x: number; z: number } | null;
}

export class FollowManager {
  /** Map of followerId -> follow state */
  private following = new Map<string, FollowState>();

  constructor(
    private world: World,
    private tileMovementManager: TileMovementManager,
  ) {}

  /**
   * Start following another player
   * Called when player selects "Follow" from context menu
   *
   * OSRS-ACCURATE: Path to target's PREVIOUS tile, not current position.
   * This creates the characteristic 1-tick trailing effect.
   *
   * @see https://rune-server.org/threads/help-with-player-dancing-spinning-when-following-each-other.706121/
   */
  startFollowing(followerId: string, targetId: string): void {
    // Can't follow yourself
    if (followerId === targetId) {
      return;
    }

    // Cancel any existing follow
    this.stopFollowing(followerId);

    // Verify target exists
    const targetEntity = this.world.entities.get(targetId);
    if (!targetEntity) {
      return;
    }

    const targetPos = targetEntity.position;
    if (!targetPos) {
      return;
    }

    // OSRS-ACCURATE: Get target's PREVIOUS tile (where they were at tick start)
    const previousTile = this.tileMovementManager.getPreviousTile(targetId);
    const previousWorld = tileToWorld(previousTile);

    this.following.set(followerId, {
      followerId,
      targetId,
      lastTargetTile: { x: previousTile.x, z: previousTile.z },
    });

    // Path to PREVIOUS tile, not current position
    // Use target's Y coordinate for terrain height
    this.tileMovementManager.movePlayerToward(
      followerId,
      { x: previousWorld.x, y: targetPos.y, z: previousWorld.z },
      true, // running
      0, // meleeRange=0 for non-combat following
    );
  }

  /**
   * Stop following
   * Called when player clicks elsewhere, trades, equips item, or target disconnects
   */
  stopFollowing(playerId: string): void {
    this.following.delete(playerId);
  }

  /**
   * Check if player is following someone
   */
  isFollowing(playerId: string): boolean {
    return this.following.has(playerId);
  }

  /**
   * Get the target being followed
   */
  getFollowTarget(playerId: string): string | null {
    return this.following.get(playerId)?.targetId ?? null;
  }

  /**
   * Process all following players - called every tick
   *
   * OSRS-ACCURATE behavior:
   * - Follower walks to the leader's PREVIOUS tile (1-tick trailing effect)
   * - Re-paths when leader moves to a new tile
   * - Continues indefinitely until cancelled
   * - Two players following each other creates "dancing" pattern (correct behavior)
   *
   * @see https://rune-server.org/threads/help-with-player-dancing-spinning-when-following-each-other.706121/
   */
  processTick(): void {
    for (const [followerId, state] of this.following) {
      // Check if target still exists (connected)
      const targetEntity = this.world.entities.get(state.targetId);
      if (!targetEntity) {
        // Target disconnected - stop following
        this.following.delete(followerId);
        continue;
      }

      // Check if follower still exists
      const followerEntity = this.world.entities.get(followerId);
      if (!followerEntity) {
        this.following.delete(followerId);
        continue;
      }

      const targetPos = targetEntity.position;
      if (!targetPos) {
        this.following.delete(followerId);
        continue;
      }

      const followerPos = followerEntity.position;
      const followerTile = worldToTile(followerPos.x, followerPos.z);

      // OSRS-ACCURATE: Get target's PREVIOUS tile (where they were at tick start)
      const previousTile = this.tileMovementManager.getPreviousTile(
        state.targetId,
      );

      // If follower is already at target's previous tile, we're correctly trailing
      if (tilesEqual(followerTile, previousTile)) {
        continue;
      }

      // Check if target moved to a new tile (previous tile changed)
      if (
        !state.lastTargetTile ||
        state.lastTargetTile.x !== previousTile.x ||
        state.lastTargetTile.z !== previousTile.z
      ) {
        // Target moved - re-path to their PREVIOUS tile
        const previousWorld = tileToWorld(previousTile);
        this.tileMovementManager.movePlayerToward(
          followerId,
          { x: previousWorld.x, y: targetPos.y, z: previousWorld.z },
          true, // running
          0, // meleeRange=0 for non-combat
        );
        state.lastTargetTile = { x: previousTile.x, z: previousTile.z };
      }
    }
  }

  /**
   * Process following for a specific player
   * Called by GameTickProcessor during player phase
   *
   * OSRS-ACCURATE: Path to target's PREVIOUS tile (1-tick trailing effect)
   */
  processPlayerTick(playerId: string): void {
    const state = this.following.get(playerId);
    if (!state) return;

    // Check if target still exists
    const targetEntity = this.world.entities.get(state.targetId);
    if (!targetEntity) {
      this.following.delete(playerId);
      return;
    }

    // Check if follower still exists
    const followerEntity = this.world.entities.get(playerId);
    if (!followerEntity) {
      this.following.delete(playerId);
      return;
    }

    const targetPos = targetEntity.position;
    if (!targetPos) {
      this.following.delete(playerId);
      return;
    }

    const followerPos = followerEntity.position;
    const followerTile = worldToTile(followerPos.x, followerPos.z);

    // OSRS-ACCURATE: Get target's PREVIOUS tile
    const previousTile = this.tileMovementManager.getPreviousTile(
      state.targetId,
    );

    // Already at target's previous tile - we're correctly trailing
    if (tilesEqual(followerTile, previousTile)) {
      return;
    }

    // Check if target moved (previous tile changed)
    if (
      !state.lastTargetTile ||
      state.lastTargetTile.x !== previousTile.x ||
      state.lastTargetTile.z !== previousTile.z
    ) {
      // Re-path to target's PREVIOUS tile
      const previousWorld = tileToWorld(previousTile);
      this.tileMovementManager.movePlayerToward(
        playerId,
        { x: previousWorld.x, y: targetPos.y, z: previousWorld.z },
        true,
        0,
      );
      state.lastTargetTile = { x: previousTile.x, z: previousTile.z };
    }
  }

  /**
   * Clean up when a player disconnects
   * Removes them as follower AND cancels anyone following them
   */
  onPlayerDisconnect(playerId: string): void {
    // Stop this player from following anyone
    this.following.delete(playerId);

    // Stop anyone following this player
    for (const [followerId, state] of this.following) {
      if (state.targetId === playerId) {
        this.following.delete(followerId);
      }
    }
  }

  /**
   * Get count of active follows (for debugging)
   */
  get size(): number {
    return this.following.size;
  }

  /**
   * Clear all follows (for shutdown)
   */
  destroy(): void {
    this.following.clear();
  }
}
