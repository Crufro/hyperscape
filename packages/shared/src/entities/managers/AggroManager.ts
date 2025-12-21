/**
 * Manages mob target acquisition. Random selection from players in range.
 * @see https://oldschool.runescape.wiki/w/Aggressiveness
 */

import type { Position3D } from "../../types";
import {
  worldToTile,
  tilesWithinRange,
  tileChebyshevDistance,
} from "../../systems/shared/movement/TileSystem";

export interface AggroConfig {
  aggroRange: number;
  combatRange: number;
}

export interface PlayerTarget {
  id: string;
  position: Position3D;
}

export class AggroManager {
  private currentTarget: string | null = null;
  private config: AggroConfig;

  private readonly _validTargetsBuffer: PlayerTarget[] = [];

  constructor(config: AggroConfig) {
    this.config = config;
  }

  /** Random selection from valid candidates in range */
  findNearbyPlayer(
    currentPos: Position3D,
    players: Array<{
      id: string;
      position?: Position3D;
      node?: { position?: Position3D };
    }>,
  ): PlayerTarget | null {
    if (players.length === 0) return null;
    this.findValidTargets(currentPos, players);
    return this.selectRandomTarget();
  }

  /** Populates _validTargetsBuffer with players in aggro range */
  findValidTargets(
    currentPos: Position3D,
    players: Array<{
      id: string;
      position?: Position3D;
      node?: { position?: Position3D };
    }>,
  ): void {
    this._validTargetsBuffer.length = 0;
    const mobTile = worldToTile(currentPos.x, currentPos.z);

    for (const player of players) {
      const playerPos = player.position || player.node?.position;
      if (!playerPos) continue;
      if (!this.isValidTarget(player)) continue;

      const playerTile = worldToTile(playerPos.x, playerPos.z);
      const tileDistance = tileChebyshevDistance(mobTile, playerTile);

      if (tileDistance <= this.config.aggroRange) {
        this._validTargetsBuffer.push({
          id: player.id,
          position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
        });
      }
    }
  }

  selectRandomTarget(): PlayerTarget | null {
    const count = this._validTargetsBuffer.length;
    if (count === 0) return null;
    if (count === 1) return this._validTargetsBuffer[0];
    return this._validTargetsBuffer[Math.floor(Math.random() * count)];
  }

  getValidTargetCount(): number {
    return this._validTargetsBuffer.length;
  }

  private isValidTarget(player: {
    id: string;
    position?: Position3D;
    node?: { position?: Position3D };
  }): boolean {
    const playerObj = player as Record<string, unknown>;

    if (
      typeof playerObj.isDead === "function" &&
      (playerObj.isDead as () => boolean)()
    ) {
      return false;
    }

    if (typeof playerObj.health === "number" && playerObj.health <= 0) {
      return false;
    }

    const health = playerObj.health as { current?: number } | undefined;
    if (health?.current !== undefined && health.current <= 0) {
      return false;
    }

    if (playerObj.alive === false) {
      return false;
    }

    if (playerObj.isLoading === true) {
      return false;
    }

    return true;
  }

  getPlayer(
    playerId: string,
    getPlayerFn: (id: string) => {
      id: string;
      position?: Position3D;
      node?: { position?: Position3D };
    } | null,
  ): PlayerTarget | null {
    const player = getPlayerFn(playerId);
    if (!player) return null;

    const playerPos = player.position || player.node?.position;
    if (!playerPos) return null;
    if (!this.isValidTarget(player)) return null;

    return {
      id: player.id,
      position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
    };
  }

  isInAggroRange(mobPos: Position3D, targetPos: Position3D): boolean {
    const mobTile = worldToTile(mobPos.x, mobPos.z);
    const targetTile = worldToTile(targetPos.x, targetPos.z);
    return tileChebyshevDistance(mobTile, targetTile) <= this.config.aggroRange;
  }

  isInCombatRange(mobPos: Position3D, targetPos: Position3D): boolean {
    const mobTile = worldToTile(mobPos.x, mobPos.z);
    const targetTile = worldToTile(targetPos.x, targetPos.z);
    const rangeTiles = Math.max(1, Math.floor(this.config.combatRange));
    return tilesWithinRange(mobTile, targetTile, rangeTiles);
  }

  setTarget(playerId: string): void {
    this.currentTarget = playerId;
  }

  getTarget(): string | null {
    return this.currentTarget;
  }

  clearTarget(): void {
    this.currentTarget = null;
  }

  setTargetIfNone(playerId: string): void {
    if (!this.currentTarget) {
      this.currentTarget = playerId;
    }
  }

  reset(): void {
    this.currentTarget = null;
  }

  getAggroRange(): number {
    return this.config.aggroRange;
  }

  getCombatRange(): number {
    return this.config.combatRange;
  }
}
