import { createNoise2D } from 'simplex-noise';
import { VEGETATION_CONFIG } from '../data/biomeConfig';
import { GEOGRAPHY_LABELS, SECTS } from '../data/regions';
import { TerrainSampler } from '../terrain/TerrainSampler';
import {
  RockPrototypeId,
  ShrubPrototypeId,
  TreePrototypeId,
  VegetationPlacement,
  VegetationPlacementResult,
  VegetationRegionId,
  VegetationStats,
} from '../types/vegetation';

type RegionWeights = ReturnType<TerrainSampler['sampleDetails']>['regionWeights'];

type Candidate = {
  nx: number;
  nz: number;
  x: number;
  y: number;
  z: number;
  slope: number;
  river: number;
  lava: number;
  region: VegetationRegionId;
  weights: RegionWeights;
};

type WeightedChoice<T extends string> = {
  id: T;
  weight: number;
};

const TREE_PROTOTYPES: TreePrototypeId[] = [
  'conifer_a',
  'conifer_b',
  'conifer_c',
  'broadleaf_a',
  'broadleaf_b',
  'broadleaf_c',
  'broadleaf_d',
  'dead_tree_a',
  'dead_tree_b',
  'volcanic_dead_tree',
  'spirit_tree',
];

const SHRUB_PROTOTYPES: ShrubPrototypeId[] = ['desert_shrub', 'forest_shrub', 'flowering_shrub'];

const ROCK_PROTOTYPES: RockPrototypeId[] = [
  'rock_granite_a',
  'rock_granite_b',
  'rock_slate',
  'rock_sandstone',
  'rock_volcanic_a',
  'rock_volcanic_b',
  'ice_crystal_a',
  'ice_crystal_b',
];

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dominantRegion(weights: RegionWeights): VegetationRegionId {
  let id: VegetationRegionId = 'central';
  let value = weights.central;
  (Object.keys(weights) as VegetationRegionId[]).forEach((key) => {
    if (weights[key] > value) {
      id = key;
      value = weights[key];
    }
  });
  return id;
}

function createPlacementMap<T extends string>(keys: readonly T[]): Map<T, VegetationPlacement[]> {
  return new Map(keys.map((key) => [key, []]));
}

export class VegetationPlacementSystem {
  private readonly random = createSeededRandom(VEGETATION_CONFIG.seed);
  private readonly clusterNoise = createNoise2D(createSeededRandom(VEGETATION_CONFIG.seed + 1));
  private readonly gapNoise = createNoise2D(createSeededRandom(VEGETATION_CONFIG.seed + 2));

  generate(sampler: TerrainSampler): VegetationPlacementResult {
    const start = performance.now();
    const quality = VEGETATION_CONFIG.defaultQuality;
    const qualityConfig = VEGETATION_CONFIG.qualityLevels[quality];
    const trees = createPlacementMap(TREE_PROTOTYPES);
    const shrubs = createPlacementMap(SHRUB_PROTOTYPES);
    const rocks = createPlacementMap(ROCK_PROTOTYPES);
    const stats: VegetationStats = {
      quality,
      initMs: 0,
      drawCalls: 0,
      estimatedGpuMemoryMb: 0,
      instanceCounts: {},
      regionCounts: { snow: 0, desert: 0, central: 0, forest: 0, fire: 0, mountain: 0 },
      floatingCorrections: 0,
      buriedCorrections: 0,
      rejectedBySectClearance: 0,
      rejectedBySlope: 0,
      rejectedByRiverOrLava: 0,
    };

    this.fillTrees(sampler, trees, qualityConfig.treeBudget, stats);
    this.fillDeadTrees(sampler, trees, qualityConfig.deadBudget, stats);
    this.fillSpiritTrees(sampler, trees, qualityConfig.spiritBudget, stats);
    this.fillShrubs(sampler, shrubs, qualityConfig.shrubBudget, stats);
    this.fillRocks(sampler, rocks, qualityConfig.rockBudget, stats);
    this.fillIceCrystals(sampler, rocks, qualityConfig.iceCrystalBudget, stats);

    [...trees, ...shrubs, ...rocks].forEach(([key, placements]) => {
      stats.instanceCounts[key] = placements.length;
    });
    stats.initMs = performance.now() - start;

    return { trees, shrubs, rocks, stats };
  }

  private fillTrees(
    sampler: TerrainSampler,
    target: Map<TreePrototypeId, VegetationPlacement[]>,
    count: number,
    stats: VegetationStats,
  ): void {
    this.fill(count, stats, () => {
      const candidate = this.sampleCandidate(sampler, stats);
      if (!candidate || candidate.slope > VEGETATION_CONFIG.maxTreeSlope) {
        if (candidate) stats.rejectedBySlope += 1;
        return false;
      }
      if (candidate.river > VEGETATION_CONFIG.riverNoTreeDepth || candidate.lava > VEGETATION_CONFIG.lavaNoNormalTree) {
        stats.rejectedByRiverOrLava += 1;
        return false;
      }

      const altitudeFade = 1 - smoothstep(42, 92, candidate.y);
      const mountainFoot = candidate.weights.mountain * altitudeFade * (1 - smoothstep(0.18, 0.36, candidate.slope));
      const snowSparse = candidate.weights.snow * altitudeFade * 0.42;
      const density =
        (candidate.weights.forest * VEGETATION_CONFIG.density.eastForest +
          candidate.weights.central * VEGETATION_CONFIG.density.centralForest +
          mountainFoot * VEGETATION_CONFIG.density.mountainFootForest +
          snowSparse * VEGETATION_CONFIG.density.snowConifer) *
        this.clusterDensity(candidate.nx, candidate.nz) *
        this.slopeFactor(candidate.slope, VEGETATION_CONFIG.maxTreeSlope) *
        this.riverFactor(candidate.river);

      if (this.random() > clamp01(density)) {
        return false;
      }

      const prototype = this.chooseTreePrototype(candidate);
      if (!prototype) {
        return false;
      }

      target.get(prototype)?.push(this.createPlacement(prototype, candidate, stats));
      return true;
    });
  }

  private fillDeadTrees(
    sampler: TerrainSampler,
    target: Map<TreePrototypeId, VegetationPlacement[]>,
    count: number,
    stats: VegetationStats,
  ): void {
    this.fill(count, stats, () => {
      const candidate = this.sampleCandidate(sampler, stats);
      if (!candidate || candidate.slope > 0.56 || candidate.river > 4.4 || candidate.lava > 0.32) {
        if (candidate?.slope && candidate.slope > 0.56) stats.rejectedBySlope += 1;
        if (candidate && (candidate.river > 4.4 || candidate.lava > 0.32)) stats.rejectedByRiverOrLava += 1;
        return false;
      }
      const density =
        (candidate.weights.fire * VEGETATION_CONFIG.density.fireDeadwood +
          candidate.weights.desert * 0.2 +
          candidate.weights.snow * 0.16 +
          candidate.weights.mountain * 0.1) *
        this.clusterDensity(candidate.nx + 7.1, candidate.nz - 3.6);
      if (this.random() > clamp01(density)) {
        return false;
      }
      const prototype: TreePrototypeId = candidate.weights.fire > 0.32 ? 'volcanic_dead_tree' : this.random() > 0.48 ? 'dead_tree_a' : 'dead_tree_b';
      target.get(prototype)?.push(this.createPlacement(prototype, candidate, stats));
      return true;
    });
  }

  private fillSpiritTrees(
    sampler: TerrainSampler,
    target: Map<TreePrototypeId, VegetationPlacement[]>,
    count: number,
    stats: VegetationStats,
  ): void {
    this.fill(count, stats, () => {
      const candidate = this.sampleCandidate(sampler, stats);
      if (!candidate || candidate.slope > 0.28 || candidate.river > 4.4 || candidate.lava > 0.02) {
        return false;
      }
      const density = (candidate.weights.forest * 0.72 + candidate.weights.central * 0.16) * this.clusterDensity(candidate.nx + 2.4, candidate.nz + 1.8);
      if (candidate.weights.forest < 0.38 || this.random() > clamp01(density)) {
        return false;
      }
      target.get('spirit_tree')?.push(this.createPlacement('spirit_tree', candidate, stats));
      return true;
    });
  }

  private fillShrubs(
    sampler: TerrainSampler,
    target: Map<ShrubPrototypeId, VegetationPlacement[]>,
    count: number,
    stats: VegetationStats,
  ): void {
    this.fill(count, stats, () => {
      const candidate = this.sampleCandidate(sampler, stats);
      if (!candidate || candidate.slope > VEGETATION_CONFIG.maxShrubSlope || candidate.river > 5 || candidate.lava > VEGETATION_CONFIG.lavaNoNormalTree) {
        if (candidate?.slope && candidate.slope > VEGETATION_CONFIG.maxShrubSlope) stats.rejectedBySlope += 1;
        if (candidate && (candidate.river > 5 || candidate.lava > VEGETATION_CONFIG.lavaNoNormalTree)) stats.rejectedByRiverOrLava += 1;
        return false;
      }
      const density =
        (candidate.weights.forest * 0.92 +
          candidate.weights.central * 0.42 +
          candidate.weights.desert * VEGETATION_CONFIG.density.desertShrub +
          candidate.weights.mountain * 0.16) *
        this.clusterDensity(candidate.nx - 1.2, candidate.nz + 5.4) *
        this.slopeFactor(candidate.slope, VEGETATION_CONFIG.maxShrubSlope);
      if (this.random() > clamp01(density)) {
        return false;
      }
      const prototype: ShrubPrototypeId =
        candidate.weights.desert > 0.38 ? 'desert_shrub' : candidate.weights.forest > 0.42 && this.random() > 0.58 ? 'flowering_shrub' : 'forest_shrub';
      target.get(prototype)?.push(this.createPlacement(prototype, candidate, stats));
      return true;
    });
  }

  private fillRocks(
    sampler: TerrainSampler,
    target: Map<RockPrototypeId, VegetationPlacement[]>,
    count: number,
    stats: VegetationStats,
  ): void {
    this.fill(count, stats, () => {
      const candidate = this.sampleCandidate(sampler, stats);
      if (!candidate || candidate.river > 5.8 || candidate.lava > 0.5) {
        if (candidate) stats.rejectedByRiverOrLava += 1;
        return false;
      }
      const slopeDensity = smoothstep(VEGETATION_CONFIG.rockSlopePreferenceStart, 0.62, candidate.slope);
      const density =
        (candidate.weights.mountain * 0.76 +
          candidate.weights.fire * 0.68 +
          candidate.weights.desert * 0.36 +
          candidate.weights.snow * 0.3 +
          slopeDensity * 0.42) *
        (0.55 + this.clusterDensity(candidate.nx + 5.2, candidate.nz - 2.4) * 0.55);
      if (this.random() > clamp01(density)) {
        return false;
      }
      const prototype = this.chooseRockPrototype(candidate);
      target.get(prototype)?.push(this.createPlacement(prototype, candidate, stats));
      return true;
    });
  }

  private fillIceCrystals(
    sampler: TerrainSampler,
    target: Map<RockPrototypeId, VegetationPlacement[]>,
    count: number,
    stats: VegetationStats,
  ): void {
    this.fill(count, stats, () => {
      const candidate = this.sampleCandidate(sampler, stats);
      if (!candidate || candidate.weights.snow < 0.42 || candidate.slope > 0.64 || candidate.river > 4) {
        return false;
      }
      const density = candidate.weights.snow * (0.35 + smoothstep(24, 76, candidate.y) * 0.48) * this.clusterDensity(candidate.nx - 5, candidate.nz - 1);
      if (this.random() > clamp01(density)) {
        return false;
      }
      const prototype: RockPrototypeId = this.random() > 0.5 ? 'ice_crystal_a' : 'ice_crystal_b';
      target.get(prototype)?.push(this.createPlacement(prototype, candidate, stats));
      return true;
    });
  }

  private fill(count: number, stats: VegetationStats, addOne: () => boolean): void {
    let added = 0;
    let attempts = 0;
    const maxAttempts = Math.max(1, count * VEGETATION_CONFIG.maxPlacementAttemptsMultiplier);
    while (added < count && attempts < maxAttempts) {
      attempts += 1;
      if (addOne()) {
        added += 1;
      }
    }
    if (added < count) {
      stats.instanceCounts.unfilled = (stats.instanceCounts.unfilled ?? 0) + (count - added);
    }
  }

  private sampleCandidate(sampler: TerrainSampler, stats: VegetationStats): Candidate | null {
    const nx = lerp(0.035, 0.965, this.random());
    const nz = lerp(0.055, 0.965, this.random());
    if (this.isInClearance(nx, nz)) {
      stats.rejectedBySectClearance += 1;
      return null;
    }
    const world = sampler.normalizedToWorld({ x: nx, z: nz });
    const details = sampler.sampleDetails(world.x, world.z);
    const slope = sampler.sampleSlope(world.x, world.z);
    return {
      nx,
      nz,
      x: world.x,
      y: details.height,
      z: world.z,
      slope,
      river: details.river,
      lava: details.lava,
      region: dominantRegion(details.regionWeights),
      weights: details.regionWeights,
    };
  }

  private createPlacement(
    prototype: TreePrototypeId | ShrubPrototypeId | RockPrototypeId,
    candidate: Candidate,
    stats: VegetationStats,
  ): VegetationPlacement {
    const ranges = VEGETATION_CONFIG.sizeRanges;
    const range =
      prototype.startsWith('conifer')
        ? ranges.conifer
        : prototype.startsWith('broadleaf')
          ? ranges.broadleaf
          : prototype === 'spirit_tree'
            ? ranges.spiritTree
            : prototype === 'volcanic_dead_tree'
              ? ranges.volcanicDeadTree
              : prototype.startsWith('dead_tree')
                ? ranges.deadTree
                : prototype.includes('shrub')
                  ? ranges.shrub
                  : prototype.startsWith('ice_crystal')
                    ? ranges.iceCrystal
                    : ranges.rock;

    const placement: VegetationPlacement = {
      prototype,
      region: candidate.region,
      x: candidate.x,
      y: candidate.y,
      z: candidate.z,
      nx: candidate.nx,
      nz: candidate.nz,
      height: lerp(range.heightMin, range.heightMax, this.random()),
      radius: lerp(range.radiusMin, range.radiusMax, this.random()),
      rotation: this.random() * Math.PI * 2,
      tiltX: lerp(-0.055, 0.055, this.random()) * (prototype.includes('dead') ? 1.8 : 1),
      tiltZ: lerp(-0.055, 0.055, this.random()) * (prototype.includes('dead') ? 1.8 : 1),
      colorJitter: lerp(-0.12, 0.12, this.random()),
      slope: candidate.slope,
    };

    if (Math.abs(placement.y - candidate.y) > VEGETATION_CONFIG.rootTolerance) {
      if (placement.y > candidate.y) stats.floatingCorrections += 1;
      if (placement.y < candidate.y) stats.buriedCorrections += 1;
      placement.y = candidate.y;
    }
    stats.regionCounts[candidate.region] += 1;
    return placement;
  }

  private chooseTreePrototype(candidate: Candidate): TreePrototypeId | null {
    const weights: Array<WeightedChoice<TreePrototypeId>> = [
      { id: 'conifer_a', weight: candidate.weights.snow * 0.42 + candidate.weights.mountain * 0.24 },
      { id: 'conifer_b', weight: candidate.weights.snow * 0.34 + candidate.weights.mountain * 0.16 },
      { id: 'conifer_c', weight: candidate.weights.snow * 0.22 + candidate.weights.mountain * 0.18 },
      { id: 'broadleaf_a', weight: candidate.weights.central * 0.26 + candidate.weights.forest * 0.2 },
      { id: 'broadleaf_b', weight: candidate.weights.central * 0.2 + candidate.weights.forest * 0.27 },
      { id: 'broadleaf_c', weight: candidate.weights.central * 0.18 + candidate.weights.forest * 0.19 },
      { id: 'broadleaf_d', weight: candidate.weights.central * 0.12 + candidate.weights.forest * 0.25 },
    ];
    return this.weightedPick(weights);
  }

  private chooseRockPrototype(candidate: Candidate): RockPrototypeId {
    const weights: Array<WeightedChoice<RockPrototypeId>> = [
      { id: 'rock_granite_a', weight: candidate.weights.mountain * 0.42 + candidate.weights.central * 0.08 },
      { id: 'rock_granite_b', weight: candidate.weights.mountain * 0.36 + candidate.weights.forest * 0.08 },
      { id: 'rock_slate', weight: candidate.weights.snow * 0.22 + candidate.weights.mountain * 0.24 },
      { id: 'rock_sandstone', weight: candidate.weights.desert * 0.62 },
      { id: 'rock_volcanic_a', weight: candidate.weights.fire * 0.58 },
      { id: 'rock_volcanic_b', weight: candidate.weights.fire * 0.48 },
    ];
    return this.weightedPick(weights) ?? 'rock_granite_a';
  }

  private weightedPick<T extends string>(weights: Array<WeightedChoice<T>>): T | null {
    const total = weights.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (total <= 0.0001) {
      return null;
    }
    let cursor = this.random() * total;
    for (const item of weights) {
      cursor -= Math.max(0, item.weight);
      if (cursor <= 0) {
        return item.id;
      }
    }
    return weights[weights.length - 1]?.id ?? null;
  }

  private clusterDensity(nx: number, nz: number): number {
    const broad = (this.clusterNoise(nx * 7.5, nz * 7.5) + 1) * 0.5;
    const gaps = (this.gapNoise(nx * 19, nz * 19) + 1) * 0.5;
    return smoothstep(0.28, 0.82, broad * 0.76 + gaps * 0.24);
  }

  private slopeFactor(slope: number, maxSlope: number): number {
    return 1 - smoothstep(maxSlope * 0.42, maxSlope, slope);
  }

  private riverFactor(river: number): number {
    if (river > VEGETATION_CONFIG.riverBoostMin && river < VEGETATION_CONFIG.riverBoostMax) {
      return 1.18;
    }
    return 1;
  }

  private isInClearance(nx: number, nz: number): boolean {
    for (const sect of SECTS) {
      const radius = VEGETATION_CONFIG.sectClearanceRadius + sect.importance * VEGETATION_CONFIG.importantSectClearanceBonus;
      if (Math.hypot(nx - sect.position.x, nz - sect.position.z) < radius) {
        return true;
      }
    }
    for (const label of GEOGRAPHY_LABELS) {
      const radius = VEGETATION_CONFIG.labelClearanceRadius + label.scale * 0.00018;
      if (Math.hypot(nx - label.position.x, nz - label.position.z) < radius) {
        return true;
      }
    }
    return false;
  }
}
