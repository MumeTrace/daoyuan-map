import { TERRAIN_CONFIG } from '../data/mapConfig';
import type { NormalizedPoint } from '../data/regions';

export type WorldPoint = {
  x: number;
  z: number;
};

export function normalizedToWorld(point: NormalizedPoint): WorldPoint {
  return {
    x: (point.x - 0.5) * TERRAIN_CONFIG.worldWidth,
    z: (point.z - 0.5) * TERRAIN_CONFIG.worldDepth,
  };
}

export function worldToNormalized(worldX: number, worldZ: number): NormalizedPoint {
  return {
    x: worldX / TERRAIN_CONFIG.worldWidth + 0.5,
    z: worldZ / TERRAIN_CONFIG.worldDepth + 0.5,
  };
}

export function getHorizontalNoiseScale(): number {
  return TERRAIN_CONFIG.baseMapSize / TERRAIN_CONFIG.mapSize;
}

export function getWorldVertexCount(): number {
  const rowSize = TERRAIN_CONFIG.segments + 1;
  return rowSize * rowSize;
}
