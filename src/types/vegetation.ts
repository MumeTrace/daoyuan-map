import * as THREE from 'three';

export type VegetationQuality = 'low' | 'medium' | 'high';

export type TreePrototypeId =
  | 'conifer_a'
  | 'conifer_b'
  | 'conifer_c'
  | 'broadleaf_a'
  | 'broadleaf_b'
  | 'broadleaf_c'
  | 'broadleaf_d'
  | 'dead_tree_a'
  | 'dead_tree_b'
  | 'volcanic_dead_tree'
  | 'spirit_tree';

export type ShrubPrototypeId = 'desert_shrub' | 'forest_shrub' | 'flowering_shrub';

export type RockPrototypeId =
  | 'rock_granite_a'
  | 'rock_granite_b'
  | 'rock_slate'
  | 'rock_sandstone'
  | 'rock_volcanic_a'
  | 'rock_volcanic_b'
  | 'ice_crystal_a'
  | 'ice_crystal_b';

export type VegetationPrototypeId = TreePrototypeId | ShrubPrototypeId | RockPrototypeId;

export type VegetationRegionId = 'snow' | 'desert' | 'central' | 'forest' | 'fire' | 'mountain';

export type VegetationPlacement = {
  prototype: VegetationPrototypeId;
  region: VegetationRegionId;
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  height: number;
  radius: number;
  rotation: number;
  tiltX: number;
  tiltZ: number;
  colorJitter: number;
  slope: number;
};

export type VegetationPlacementResult = {
  trees: Map<TreePrototypeId, VegetationPlacement[]>;
  shrubs: Map<ShrubPrototypeId, VegetationPlacement[]>;
  rocks: Map<RockPrototypeId, VegetationPlacement[]>;
  stats: VegetationStats;
};

export type VegetationStats = {
  quality: VegetationQuality;
  initMs: number;
  drawCalls: number;
  estimatedGpuMemoryMb: number;
  instanceCounts: Record<string, number>;
  regionCounts: Record<VegetationRegionId, number>;
  floatingCorrections: number;
  buriedCorrections: number;
  rejectedBySectClearance: number;
  rejectedBySlope: number;
  rejectedByRiverOrLava: number;
};

export type InstancedPartOptions = {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  placements: VegetationPlacement[];
  transform: (placement: VegetationPlacement, index: number, matrix: THREE.Matrix4) => void;
  color?: (placement: VegetationPlacement, color: THREE.Color) => void;
  castShadow?: boolean;
};
