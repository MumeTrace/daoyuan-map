import { createNoise2D } from 'simplex-noise';
import { MAIN_VOLCANO_CONFIG, MOUNTAIN_CONFIG, TERRAIN_CONFIG, TERRAIN_SCALE_CONFIG } from '../data/mapConfig';
import { NormalizedPoint } from '../data/regions';
import { getHorizontalNoiseScale, worldToNormalized } from '../utils/MapCoordinateSystem';

export type TerrainContributions = {
  macroHeight: number;
  regionHeight: number;
  mountainHeight: number;
  ridgeHeight: number;
  hillHeight: number;
  volcanoHeight: number;
  valleyDepth: number;
  riverDepth: number;
  erosionDepth: number;
};

export type TerrainSample = {
  height: number;
  regionWeights: {
    snow: number;
    desert: number;
    central: number;
    forest: number;
    fire: number;
    mountain: number;
  };
  regionWeightSum: number;
  river: number;
  lava: number;
  mountainInfluence: number;
  valley: number;
  volcano: number;
  erosion: number;
  contributions: TerrainContributions;
};

type Noise2D = (x: number, y: number) => number;
type RegionWeights = TerrainSample['regionWeights'];

const REGION_BASE_HEIGHTS: RegionWeights = {
  snow: 7,
  desert: -1.5,
  central: -4,
  forest: 1.8,
  fire: 4.5,
  mountain: 13,
};

const VALLEY_PATHS = [
  { path: [{ x: 0.76, z: 0.22 }, { x: 0.84, z: 0.48 }, { x: 0.78, z: 0.72 }], depth: 15, width: 0.05 },
  { path: [{ x: 0.32, z: 0.34 }, { x: 0.45, z: 0.42 }, { x: 0.62, z: 0.44 }], depth: 9, width: 0.046 },
  { path: [{ x: 0.39, z: 0.72 }, { x: 0.55, z: 0.74 }, { x: 0.72, z: 0.82 }], depth: 10, width: 0.048 },
] as const;

const VOLCANOES = [
  { x: 0.42, z: 0.8, radius: 0.075, height: 9, seed: 3 },
  { x: 0.71, z: 0.78, radius: 0.07, height: 8, seed: 17 },
] as const;

const MAIN_VOLCANO_LAVA_PATHS = [
  [
    { x: MAIN_VOLCANO_CONFIG.centerX, z: MAIN_VOLCANO_CONFIG.centerZ },
    { x: MAIN_VOLCANO_CONFIG.centerX - 0.05, z: MAIN_VOLCANO_CONFIG.centerZ + 0.035 },
    { x: MAIN_VOLCANO_CONFIG.centerX - 0.12, z: MAIN_VOLCANO_CONFIG.centerZ + 0.075 },
  ],
  [
    { x: MAIN_VOLCANO_CONFIG.centerX, z: MAIN_VOLCANO_CONFIG.centerZ },
    { x: MAIN_VOLCANO_CONFIG.centerX + 0.045, z: MAIN_VOLCANO_CONFIG.centerZ + 0.028 },
    { x: MAIN_VOLCANO_CONFIG.centerX + 0.11, z: MAIN_VOLCANO_CONFIG.centerZ + 0.052 },
  ],
  [
    { x: MAIN_VOLCANO_CONFIG.centerX, z: MAIN_VOLCANO_CONFIG.centerZ },
    { x: MAIN_VOLCANO_CONFIG.centerX + 0.012, z: MAIN_VOLCANO_CONFIG.centerZ + 0.06 },
    { x: MAIN_VOLCANO_CONFIG.centerX + 0.01, z: MAIN_VOLCANO_CONFIG.centerZ + 0.12 },
  ],
] as const;

const SNOW_PEAKS = [
  { x: 0.24, z: 0.16, radius: 0.105, height: 28 },
  { x: 0.38, z: 0.14, radius: 0.115, height: 34 },
  { x: 0.52, z: 0.16, radius: 0.112, height: 32 },
  { x: 0.66, z: 0.2, radius: 0.1, height: 28 },
  { x: 0.46, z: 0.28, radius: 0.085, height: 22 },
] as const;

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
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function smootherstep(edge0: number, edge1: number, value: number): number {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function ellipseInfluence(nx: number, nz: number, cx: number, cz: number, rx: number, rz: number): number {
  const dx = (nx - cx) / rx;
  const dz = (nz - cz) / rz;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return 1 - smootherstep(0.48, 1.16, distance);
}

function lineDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLength = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLength));
  const x = ax + abx * t;
  const z = az + abz * t;
  return Math.hypot(px - x, pz - z);
}

function pathDistance(px: number, pz: number, path: readonly NormalizedPoint[]): number {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < path.length - 1; index += 1) {
    const current = path[index];
    const next = path[index + 1];
    distance = Math.min(distance, lineDistance(px, pz, current.x, current.z, next.x, next.z));
  }
  return distance;
}

function pathInfluence(px: number, pz: number, path: readonly NormalizedPoint[], width: number): number {
  return 1 - smootherstep(0, width, pathDistance(px, pz, path));
}

function normalizeWeights(weights: RegionWeights): { normalized: RegionWeights; sum: number } {
  const sum = weights.snow + weights.desert + weights.central + weights.forest + weights.fire + weights.mountain;
  const divisor = sum > 0.0001 ? sum : 1;
  return {
    normalized: {
      snow: weights.snow / divisor,
      desert: weights.desert / divisor,
      central: weights.central / divisor,
      forest: weights.forest / divisor,
      fire: weights.fire / divisor,
      mountain: weights.mountain / divisor,
    },
    sum,
  };
}

export class TerrainHeight {
  private readonly continentNoise: Noise2D;
  private readonly detailNoise: Noise2D;
  private readonly ridgeNoise: Noise2D;
  private readonly erosionNoise: Noise2D;
  private readonly horizontalNoiseScale = getHorizontalNoiseScale();

  constructor(seed = TERRAIN_CONFIG.seed) {
    this.continentNoise = createNoise2D(createSeededRandom(seed));
    this.detailNoise = createNoise2D(createSeededRandom(seed + 37));
    this.ridgeNoise = createNoise2D(createSeededRandom(seed + 71));
    this.erosionNoise = createNoise2D(createSeededRandom(seed + 109));
  }

  /** 根据世界坐标采样最终地形高度，以及各高度贡献。 */
  sample(worldX: number, worldZ: number): TerrainSample {
    const { x: nx, z: nz } = worldToNormalized(worldX, worldZ);
    const noiseX = worldX * this.horizontalNoiseScale;
    const noiseZ = worldZ * this.horizontalNoiseScale;
    const rawWeights = this.regionWeights(nx, nz);
    const { normalized: regionWeights, sum: regionWeightSum } = normalizeWeights(rawWeights);

    const lowNoise = this.continentNoise(noiseX * 0.0034, noiseZ * 0.0034);
    const broadNoise = this.continentNoise(noiseX * 0.0065 + 19, noiseZ * 0.0065 - 11);
    const mediumNoise = this.detailNoise(noiseX * 0.014, noiseZ * 0.014);
    const detailNoise = this.detailNoise(noiseX * 0.034 - 21, noiseZ * 0.034 + 13);
    const ridgeRaw = this.ridgeNoise(noiseX * MOUNTAIN_CONFIG.ridgeFrequency, noiseZ * MOUNTAIN_CONFIG.ridgeFrequency);
    const ridgeNoise = Math.pow(Math.max(0, 1 - Math.abs(ridgeRaw)), MOUNTAIN_CONFIG.ridgePower);
    const sideRidge = Math.pow(
      Math.max(0, 1 - Math.abs(this.ridgeNoise(noiseX * MOUNTAIN_CONFIG.sideRidgeFrequency + 7, noiseZ * MOUNTAIN_CONFIG.sideRidgeFrequency - 3))),
      2,
    );

    const macroHeight = lowNoise * 10 + broadNoise * 5.5;
    const regionHeight = this.regionHeight(regionWeights);
    const { mountainHeight, ridgeHeight, mountainInfluence } = this.mountainPathHeight(nx, nz, noiseX, noiseZ, ridgeNoise, sideRidge);
    const snowPeakHeight = this.snowPeakHeight(nx, nz, noiseX, noiseZ, regionWeights.snow, ridgeNoise);
    const hillHeight = this.hillHeight(regionWeights, noiseX, noiseZ, mediumNoise, detailNoise, mountainInfluence);
    const { volcanoHeight, lava } = this.volcanoHeight(nx, nz, noiseX, noiseZ);
    const riverDepth = this.riverDepth(nx, nz);
    const valleyDepth = this.valleyInfluence(nx, nz, riverDepth);
    const erosionDepth = this.erosionDepth(noiseX, noiseZ, mountainInfluence, ridgeNoise, sideRidge, riverDepth, valleyDepth);
    const edgeDrop = this.edgeDrop(nx, nz);

    const contributions: TerrainContributions = {
      macroHeight,
      regionHeight,
      mountainHeight,
      ridgeHeight,
      hillHeight,
      volcanoHeight,
      valleyDepth,
      riverDepth,
      erosionDepth,
    };

    const height =
      (TERRAIN_CONFIG.baseWaterLevel +
        macroHeight +
        regionHeight +
        mountainHeight +
        ridgeHeight +
        snowPeakHeight +
        hillHeight +
        volcanoHeight -
        valleyDepth -
        riverDepth -
        erosionDepth -
        edgeDrop) *
      TERRAIN_SCALE_CONFIG.terrainVerticalScale;

    return {
      height,
      regionWeights,
      regionWeightSum,
      river: riverDepth,
      lava,
      mountainInfluence,
      valley: valleyDepth,
      volcano: Math.max(0, volcanoHeight),
      erosion: erosionDepth,
      contributions,
    };
  }

  private regionWeights(nx: number, nz: number): RegionWeights {
    const mountain = Math.max(
      ellipseInfluence(nx, nz, 0.89, 0.28, 0.2, 0.38),
      this.outerRingInfluence(nx, nz) * 0.85,
      this.northEastRidgeInfluence(nx, nz) * 0.78,
    );
    return {
      snow: ellipseInfluence(nx, nz, 0.47, 0.2, 0.34, 0.24),
      desert: ellipseInfluence(nx, nz, 0.18, 0.54, 0.27, 0.36),
      central: ellipseInfluence(nx, nz, 0.5, 0.56, 0.34, 0.29),
      forest: ellipseInfluence(nx, nz, 0.79, 0.53, 0.27, 0.33),
      fire: ellipseInfluence(nx, nz, 0.53, 0.84, 0.38, 0.21),
      mountain,
    };
  }

  private regionHeight(weights: RegionWeights): number {
    return (
      weights.snow * REGION_BASE_HEIGHTS.snow +
      weights.desert * REGION_BASE_HEIGHTS.desert +
      weights.central * REGION_BASE_HEIGHTS.central +
      weights.forest * REGION_BASE_HEIGHTS.forest +
      weights.fire * REGION_BASE_HEIGHTS.fire +
      weights.mountain * REGION_BASE_HEIGHTS.mountain
    );
  }

  private hillHeight(weights: RegionWeights, worldX: number, worldZ: number, mediumNoise: number, detailNoise: number, mountainInfluence: number): number {
    const centralHills = weights.central * (1 - mountainInfluence) * (5 + mediumNoise * 4.2 + detailNoise * 1.4);
    const forestHills = weights.forest * (8 + mediumNoise * 6 + detailNoise * 2);
    const snowPlateau = weights.snow * (6 + mediumNoise * 3.8);
    const desertDunes =
      weights.desert *
      (Math.sin(worldX * 0.082 + worldZ * 0.033) * 4.2 + Math.sin(worldX * 0.036 - worldZ * 0.074) * 2.2 + 5.8);
    const footSediment = mountainInfluence * (1 - Math.min(1, mountainInfluence * 1.7)) * TERRAIN_SCALE_CONFIG.sedimentStrength;
    return centralHills + forestHills + snowPlateau + desertDunes + footSediment;
  }

  private snowPeakHeight(nx: number, nz: number, worldX: number, worldZ: number, snowWeight: number, ridgeNoise: number): number {
    if (snowWeight < 0.08) {
      return 0;
    }

    let height = 0;
    const iceRidge = Math.pow(Math.max(0, 1 - Math.abs(this.ridgeNoise(worldX * 0.025 + 91, worldZ * 0.025 - 37))), 2.8);
    for (const peak of SNOW_PEAKS) {
      const distance = Math.hypot(nx - peak.x, nz - peak.z);
      const base = clamp01(1 - smootherstep(peak.radius * 0.18, peak.radius, distance));
      const crest = clamp01(1 - smootherstep(0, peak.radius * 0.38, distance));
      const shoulder = Math.pow(base, 1.38) * peak.height * 0.58;
      const sharpSnowCrest = Math.pow(crest, 2.05) * peak.height * (0.2 + iceRidge * 0.42 + ridgeNoise * 0.14);
      height += shoulder + sharpSnowCrest;
    }

    const snowfieldBand = pathInfluence(
      nx,
      nz,
      [
        { x: 0.16, z: 0.2 },
        { x: 0.34, z: 0.16 },
        { x: 0.56, z: 0.18 },
        { x: 0.78, z: 0.28 },
      ],
      0.115,
    );
    const highSnowRidge = pathInfluence(
      nx,
      nz,
      [
        { x: 0.2, z: 0.13 },
        { x: 0.38, z: 0.1 },
        { x: 0.58, z: 0.13 },
        { x: 0.76, z: 0.22 },
      ],
      0.055,
    );
    height += snowfieldBand * (10 + iceRidge * 12);
    height += highSnowRidge * (16 + iceRidge * 18 + ridgeNoise * 8);
    return height * Math.min(1, snowWeight * 1.65);
  }

  private mountainPathHeight(
    nx: number,
    nz: number,
    worldX: number,
    worldZ: number,
    ridgeNoise: number,
    sideRidge: number,
  ): { mountainHeight: number; ridgeHeight: number; mountainInfluence: number } {
    const wobble = this.continentNoise(worldX * 0.005 + 41, worldZ * 0.005 - 23) * 0.014;
    const px = nx + wobble * 0.55;
    const pz = nz + wobble;

    const endless = this.mountainBand(
      px,
      pz,
      MOUNTAIN_CONFIG.endlessMountains.path,
      MOUNTAIN_CONFIG.endlessMountains.width * 1.22,
      MOUNTAIN_CONFIG.endlessMountains.height,
      ridgeNoise,
    );
    const endlessBranch = this.branchBands(px, pz, MOUNTAIN_CONFIG.endlessMountains.branches, MOUNTAIN_CONFIG.endlessMountains.width * 0.78, 38, sideRidge);
    const snow = this.mountainBand(px, pz, MOUNTAIN_CONFIG.northernSnowfield.path, MOUNTAIN_CONFIG.northernSnowfield.width * 1.08, 40, ridgeNoise);
    const snowBranch = this.branchBands(px, pz, MOUNTAIN_CONFIG.northernSnowfield.branches, MOUNTAIN_CONFIG.northernSnowfield.width * 0.65, 17, sideRidge);
    const fire = this.mountainBand(px, pz, MOUNTAIN_CONFIG.southVolcanicHighland.path, MOUNTAIN_CONFIG.southVolcanicHighland.width * 1.05, 24, sideRidge);
    const fireBranch = this.branchBands(px, pz, MOUNTAIN_CONFIG.southVolcanicHighland.branches, MOUNTAIN_CONFIG.southVolcanicHighland.width * 0.64, 10, sideRidge);
    const central = this.mountainBand(px, pz, MOUNTAIN_CONFIG.centralHills.path, MOUNTAIN_CONFIG.centralHills.width * 1.22, 8, sideRidge);

    const mountainHeight = endless.body + endlessBranch.body + snow.body + snowBranch.body + fire.body + fireBranch.body + central.body;
    const ridgeHeight = endless.ridge + endlessBranch.ridge + snow.ridge + snowBranch.ridge + fire.ridge + fireBranch.ridge + central.ridge;
    const mountainInfluence = Math.max(endless.influence, endlessBranch.influence, snow.influence, snowBranch.influence, fire.influence, fireBranch.influence, central.influence);

    return {
      mountainHeight: Math.min(TERRAIN_SCALE_CONFIG.maximumMountainHeight * 0.9, mountainHeight),
      ridgeHeight: Math.min(TERRAIN_SCALE_CONFIG.maximumMountainHeight * 0.46, ridgeHeight),
      mountainInfluence,
    };
  }

  private mountainBand(px: number, pz: number, path: readonly NormalizedPoint[], width: number, height: number, ridgeNoise: number): { body: number; ridge: number; influence: number } {
    const distance = pathDistance(px, pz, path);
    const broadWidth = Math.max(width, TERRAIN_SCALE_CONFIG.mountainBaseWidth * (height / TERRAIN_SCALE_CONFIG.maximumMountainHeight));
    const bodyInfluence = 1 - smootherstep(0, broadWidth, distance);
    const crestInfluence = 1 - smootherstep(0, broadWidth * 0.34, distance);
    const shoulder = Math.pow(bodyInfluence, 1.45);
    const ridge = Math.pow(crestInfluence, 1.8) * height * (0.16 + ridgeNoise * 0.28);
    const body = shoulder * height * (0.36 + ridgeNoise * 0.12);
    return { body, ridge, influence: bodyInfluence };
  }

  private branchBands(px: number, pz: number, paths: readonly (readonly NormalizedPoint[])[], width: number, height: number, ridgeNoise: number): { body: number; ridge: number; influence: number } {
    let body = 0;
    let ridge = 0;
    let influence = 0;
    for (const path of paths) {
      const band = this.mountainBand(px, pz, path, width, height, ridgeNoise);
      body += band.body * 0.78;
      ridge += band.ridge * 0.7;
      influence = Math.max(influence, band.influence * 0.82);
    }
    return { body, ridge, influence };
  }

  private valleyInfluence(nx: number, nz: number, riverDepth: number): number {
    let valleyDepth = 0;
    for (const valley of VALLEY_PATHS) {
      valleyDepth += pathInfluence(nx, nz, valley.path, valley.width) * valley.depth;
    }
    return valleyDepth + Math.min(1, riverDepth / 6) * TERRAIN_SCALE_CONFIG.riverValleyDepth;
  }

  private erosionDepth(worldX: number, worldZ: number, mountainInfluence: number, ridgeNoise: number, sideRidge: number, riverDepth: number, valleyDepth: number): number {
    const slopeProxy = clamp01(mountainInfluence * 0.68 + ridgeNoise * 0.28 + sideRidge * 0.18);
    const gullyNoise = Math.pow(Math.abs(this.erosionNoise(worldX * 0.045 + 13, worldZ * 0.045 - 7)), 2.4);
    const directionalGullies = Math.pow(Math.abs(this.erosionNoise((worldX + worldZ) * 0.038, (worldZ - worldX) * 0.021)), 2.1);
    const slopeCut = Math.max(0, slopeProxy - 0.45) * TERRAIN_SCALE_CONFIG.erosionStrength;
    const gullyCut = (gullyNoise * 5.5 + directionalGullies * 3.8) * slopeProxy;
    const riverCut = Math.min(1, riverDepth / 7) * 3.2;
    const valleyCut = Math.min(1, valleyDepth / 18) * 2.4;
    return slopeCut + gullyCut + riverCut + valleyCut;
  }

  private outerRingInfluence(nx: number, nz: number): number {
    const edgeDistance = Math.min(nx, nz, 1 - nx, 1 - nz);
    return 1 - smootherstep(0.025, 0.18, edgeDistance);
  }

  private northEastRidgeInfluence(nx: number, nz: number): number {
    const distance = lineDistance(nx, nz, 0.72, 0.1, 0.96, 0.77);
    return 1 - smootherstep(0.025, 0.16, distance);
  }

  private riverDepth(nx: number, nz: number): number {
    const westRiver = 1 - smootherstep(0.006, 0.034, lineDistance(nx, nz, 0.24, 0.68, 0.43, 0.77));
    return westRiver * 5.2;
  }

  private lavaCrack(nx: number, nz: number): number {
    const crackA = 1 - smootherstep(0.005, 0.031, lineDistance(nx, nz, 0.34, 0.78, 0.76, 0.9));
    const crackB = 1 - smootherstep(0.004, 0.027, lineDistance(nx, nz, 0.48, 0.69, 0.55, 0.98));
    const crackC = 1 - smootherstep(0.004, 0.025, lineDistance(nx, nz, 0.39, 0.92, 0.66, 0.78));
    let mainChannel = 0;
    for (const path of MAIN_VOLCANO_LAVA_PATHS) {
      const distance = pathDistance(nx, nz, path);
      mainChannel = Math.max(mainChannel, 1 - smootherstep(0.0025, MAIN_VOLCANO_CONFIG.lavaChannelWidth, distance));
    }
    const mainCraterDistance = Math.hypot(nx - MAIN_VOLCANO_CONFIG.centerX, nz - MAIN_VOLCANO_CONFIG.centerZ);
    const mainCrater = 1 - smootherstep(MAIN_VOLCANO_CONFIG.craterRadius * 0.48, MAIN_VOLCANO_CONFIG.craterRadius * 1.42, mainCraterDistance);
    const fire = ellipseInfluence(nx, nz, 0.53, 0.84, 0.38, 0.21);
    return Math.max(crackA * 0.46, crackB * 0.44, crackC * 0.4, mainChannel, mainCrater * 0.9) * fire;
  }

  private volcanoHeight(nx: number, nz: number, worldX: number, worldZ: number): { volcanoHeight: number; lava: number } {
    const main = this.mainVolcanoHeight(nx, nz, worldX, worldZ);
    let height = main.height;
    let lava = Math.max(this.lavaCrack(nx, nz), main.lava);
    for (const volcano of VOLCANOES) {
      const dx = nx - volcano.x;
      const dz = nz - volcano.z;
      const angleNoise = this.continentNoise(worldX * 0.011 + volcano.seed, worldZ * 0.011 - volcano.seed) * 0.16;
      const distance = Math.hypot(dx * (1 + angleNoise), dz * (1 - angleNoise * 0.7));
      const base = 1 - smootherstep(0, volcano.radius * 1.55, distance);
      const slope = 1 - smootherstep(0, volcano.radius, distance);
      const rim = Math.pow(1 - smootherstep(volcano.radius * 0.18, volcano.radius * 0.48, Math.abs(distance - volcano.radius * 0.36)), 1.4);
      const crater = 1 - smootherstep(0, volcano.radius * 0.34, distance);
      const roughness = 0.82 + this.detailNoise(worldX * 0.031 + volcano.seed, worldZ * 0.031) * 0.18;
      const volcanoBody = base * volcano.height * 0.34 + slope * volcano.height * 0.38 * roughness + rim * volcano.height * 0.24 - crater * volcano.height * 0.46;
      height += volcanoBody;
      lava = Math.max(lava, crater * 0.2 + rim * 0.08);
    }
    return { volcanoHeight: height, lava };
  }

  private mainVolcanoHeight(nx: number, nz: number, worldX: number, worldZ: number): { height: number; lava: number } {
    const config = MAIN_VOLCANO_CONFIG;
    const dx = nx - config.centerX;
    const dz = nz - config.centerZ;
    const angle = Math.atan2(dz, dx);
    const distance = Math.hypot(dx, dz);
    const angularNoise = this.continentNoise(Math.cos(angle) * 3.2 + 19, Math.sin(angle) * 3.2 - 7) * config.irregularity;
    const noisyDistance = distance * (1 + angularNoise * 0.42);
    const base = 1 - smootherstep(config.baseRadius * 0.24, config.baseRadius, noisyDistance);
    const shoulder = 1 - smootherstep(config.baseRadius * 0.08, config.baseRadius * 0.72, noisyDistance);
    const rimDistance = Math.abs(noisyDistance - config.rimRadius);
    const rim = Math.pow(1 - smootherstep(0, config.craterRadius * 0.78, rimDistance), 1.35);
    const crater = Math.pow(1 - smootherstep(0, config.craterRadius * 1.12, noisyDistance), 1.2);
    const radial = Math.pow(Math.max(0, Math.cos(angle * 6 + this.detailNoise(worldX * 0.01, worldZ * 0.01) * 1.4)), 2.2);
    const radialFade = 1 - smootherstep(config.rimRadius * 0.8, config.baseRadius * 0.92, noisyDistance);
    const slopeNoise = this.detailNoise(worldX * 0.024 + 8, worldZ * 0.024 - 6) * 0.5 + 0.5;
    let channelCut = 0;
    let lava = crater * 0.92 + rim * 0.22;

    for (const path of MAIN_VOLCANO_LAVA_PATHS) {
      const channelDistance = pathDistance(nx, nz, path);
      const channel = 1 - smootherstep(config.lavaChannelWidth * 0.22, config.lavaChannelWidth, channelDistance);
      const channelLengthFade = 1 - smootherstep(config.craterRadius * 0.45, config.baseRadius * 1.05, noisyDistance);
      channelCut += channel * channelLengthFade;
      lava = Math.max(lava, channel * channelLengthFade);
    }

    const volcanoBase = Math.pow(base, 1.48) * config.peakHeight * 0.48;
    const irregularSlope = Math.pow(shoulder, 1.28) * config.peakHeight * (0.22 + slopeNoise * 0.18);
    const radialRidges = radial * radialFade * config.ridgeStrength;
    const craterDepression = crater * config.craterDepth;
    const erosionChannels = Math.min(1, channelCut) * 5.6;
    const height = volcanoBase + irregularSlope + radialRidges + rim * config.peakHeight * 0.3 - craterDepression - erosionChannels;

    return {
      height,
      lava: clamp01(lava),
    };
  }

  private edgeDrop(nx: number, nz: number): number {
    const edgeDistance = Math.min(nx, nz, 1 - nx, 1 - nz);
    return (1 - smootherstep(0, 0.045, edgeDistance)) * 15;
  }
}
