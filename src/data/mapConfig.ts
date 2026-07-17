export const MAP_BUTTON_NAME = '地图';

export const MAP_DOM_IDS = {
  style: 'xuantian-map-style',
  modal: 'xuantian-map-modal',
  fallbackButton: 'xuantian-map-fallback-button',
  floatingButton: 'xuantian-map-floating-button',
} as const;

export const MAP_STORAGE_KEYS = {
  floatingButtonPosition: 'xuantian-map-floating-button-position',
  modalSize: 'xuantian-map-modal-size',
} as const;

export const MAP_WINDOW_SIZES = [25, 50, 100] as const;
export type MapWindowSize = (typeof MAP_WINDOW_SIZES)[number];

const BASE_MAP_SIZE = 720;
const MAP_WORLD_SCALE = 1.5;
const MAP_WORLD_SIZE = BASE_MAP_SIZE * MAP_WORLD_SCALE;

export const TERRAIN_QUALITY_CONFIG = {
  default: 'high',
  levels: {
    low: { segments: 420 },
    medium: { segments: 520 },
    high: { segments: 600 },
  },
} as const;

export const RENDER_CONFIG = {
  maxDevicePixelRatio: 2,
  cameraFov: 34,
  cameraNear: 0.1,
  cameraFar: 6200,
  initialCameraPosition: { x: 560, y: 820, z: 1320 },
  controlsMinDistance: 135,
  controlsMaxDistance: 2400,
  controlsMaxPolarAngle: Math.PI * 0.45,
} as const;

export const RENDER_QUALITY_CONFIG = {
  default: 'high',
  levels: {
    high: {
      maxDevicePixelRatio: 2,
      shadowMapSize: 3072,
      anisotropy: 8,
      terrainTextureSize: 1024,
      toneMappingExposure: 1.04,
    },
    medium: {
      maxDevicePixelRatio: 1.5,
      shadowMapSize: 2048,
      anisotropy: 4,
      terrainTextureSize: 512,
      toneMappingExposure: 1.02,
    },
    low: {
      maxDevicePixelRatio: 1,
      shadowMapSize: 1024,
      anisotropy: 2,
      terrainTextureSize: 256,
      toneMappingExposure: 1,
    },
  },
} as const;

export const ASSET_CONFIG = {
  assetBaseUrl: '',
  terrainTexturePath: 'textures/terrain/generated',
  modelPath: 'models',
  landmarkModelPath: 'models/landmarks',
  decoderPath: 'models/decoders',
  useExternalModels: true,
  enableDraco: false,
  enableKtx2: false,
  modelLoadTimeoutMs: 4500,
  forceProceduralModelsInLowQuality: true,
  lodDistances: {
    high: 0,
    medium: 520,
    low: 1080,
  },
} as const;

export const TERRAIN_TEXTURE_CONFIG = {
  defaultQuality: 'high',
  terrainLineDebugMode: 'full' as
    | 'full'
    | 'hide-all-lines'
    | 'geometry-lines-only'
    | 'basecolor-only'
    | 'vertex-color-only'
    | 'normal-disabled'
    | 'ao-disabled'
    | 'roughness-disabled'
    | 'roads-only'
    | 'boundaries-only'
    | 'debug-paths-only',
  levels: {
    high: {
      baseColorSize: 3072,
      normalSize: 3072,
      ormSize: 2048,
      emissiveSize: 2048,
      normalScale: 0.28,
      aoMapIntensity: 0.42,
      emissiveIntensity: 0.85,
    },
    medium: {
      baseColorSize: 2048,
      normalSize: 2048,
      ormSize: 2048,
      emissiveSize: 2048,
      normalScale: 0.24,
      aoMapIntensity: 0.38,
      emissiveIntensity: 0.72,
    },
    low: {
      baseColorSize: 1024,
      normalSize: 1024,
      ormSize: 1024,
      emissiveSize: 1024,
      normalScale: 0.2,
      aoMapIntensity: 0.34,
      emissiveIntensity: 0.5,
    },
  },
} as const;

export const TERRAIN_MATERIAL_CONFIG = {
  macroScale: 0.006,
  grassDetailScale: 0.075,
  dirtDetailScale: 0.085,
  rockDetailScale: 0.115,
  sandDetailScale: 0.095,
  snowDetailScale: 0.082,
  volcanicDetailScale: 0.12,
  normalDetailMultiplier: 1.55,
  normalStrength: 0.36,
  roughnessStrength: 0.46,
  lavaEdgeSharpness: 0.018,
  debugWeightMode: 0,
} as const;

export const TERRAIN_CONFIG = {
  baseMapSize: BASE_MAP_SIZE,
  worldScale: MAP_WORLD_SCALE,
  mapSize: MAP_WORLD_SIZE,
  worldWidth: MAP_WORLD_SIZE,
  worldDepth: MAP_WORLD_SIZE,
  segments: TERRAIN_QUALITY_CONFIG.levels[TERRAIN_QUALITY_CONFIG.default].segments,
  seed: 20260716,
  baseWaterLevel: -9,
  colorBlendSharpness: 2.25,
  borderSampleStep: 0.008,
  borderLift: 1.7,
  labelLift: 27,
} as const;

export const TERRAIN_SCALE_CONFIG = {
  mapSize: TERRAIN_CONFIG.mapSize,
  terrainVerticalScale: 1,
  ordinaryHillHeight: { min: 6, max: 20 },
  normalMountainHeight: { min: 24, max: 58 },
  maximumMountainHeight: 118,
  mountainBaseWidth: 0.13,
  volcanoHeight: { min: 16, max: 34 },
  volcanoRadius: { min: 0.075, max: 0.13 },
  decorativePeakMaxHeight: 13,
  decorativePeakMaxRadius: 5.2,
  erosionStrength: 12,
  riverValleyDepth: 7,
  sedimentStrength: 5.5,
} as const;

export const MAIN_VOLCANO_CONFIG = {
  centerX: 0.56,
  centerZ: 0.84,
  baseRadius: 0.19,
  peakHeight: 58,
  craterRadius: 0.046,
  craterDepth: 22,
  ridgeStrength: 16,
  irregularity: 0.28,
  lavaChannelCount: 3,
  lavaChannelWidth: 0.016,
  rimRadius: 0.074,
  smokeParticleCount: 34,
  emberParticleCount: 18,
  lightIntensity: 3.2,
  lightDistance: 215,
} as const;

export const SNOW_EFFECT_CONFIG = {
  enabled: true,
  particleCount: 920,
  center: { x: 0.47, z: 0.2 },
  radius: { x: 0.34, z: 0.22 },
  minLift: 16,
  maxLift: 96,
  fallSpeed: { min: 4.8, max: 13.5 },
  windSpeed: 0.55,
  windStrength: 7.5,
  particleSize: 3.2,
  opacity: 0.72,
} as const;

export const BOUNDARY_CONFIG = {
  showRegionBoundariesByDefault: false,
  roadOpacity: 0.34,
  lavaCrackOpacity: 0.72,
} as const;

export const WORLD_SCALE_CONFIG = {
  mapWidth: TERRAIN_CONFIG.worldWidth,
  mapDepth: TERRAIN_CONFIG.worldDepth,
  horizontalScale: TERRAIN_CONFIG.worldScale,
  verticalScale: TERRAIN_SCALE_CONFIG.terrainVerticalScale,
  hillHeight: { min: 8, max: 25 },
  mountainHeight: { min: 25, max: 65 },
  highestMountainHeight: { min: 65, max: 100 },
  treeHeight: { min: 2.5, max: 5.5 },
  ancientTreeHeight: { min: 6, max: 10 },
  sectBuildingHeight: { min: 5, max: 12 },
  palaceHeight: { min: 12, max: 20 },
} as const;

export const MOUNTAIN_CONFIG = {
  ridgeFrequency: 0.018,
  ridgePower: 2.45,
  sideRidgeFrequency: 0.032,
  valleyWidth: 0.026,
  endlessMountains: {
    width: 0.128,
    height: 108,
    path: [
      { x: 0.78, z: 0.04 },
      { x: 0.9, z: 0.18 },
      { x: 0.95, z: 0.36 },
      { x: 0.93, z: 0.58 },
      { x: 0.86, z: 0.82 },
    ],
    branches: [
      [
        { x: 0.86, z: 0.2 },
        { x: 0.76, z: 0.3 },
        { x: 0.69, z: 0.43 },
      ],
      [
        { x: 0.91, z: 0.5 },
        { x: 0.8, z: 0.58 },
        { x: 0.68, z: 0.66 },
      ],
      [
        { x: 0.95, z: 0.28 },
        { x: 0.86, z: 0.42 },
        { x: 0.77, z: 0.56 },
      ],
    ],
  },
  northernSnowfield: {
    width: 0.155,
    height: 72,
    path: [
      { x: 0.16, z: 0.16 },
      { x: 0.32, z: 0.11 },
      { x: 0.5, z: 0.12 },
      { x: 0.68, z: 0.17 },
      { x: 0.82, z: 0.25 },
    ],
    branches: [
      [
        { x: 0.32, z: 0.13 },
        { x: 0.28, z: 0.24 },
        { x: 0.22, z: 0.35 },
      ],
      [
        { x: 0.5, z: 0.13 },
        { x: 0.48, z: 0.25 },
        { x: 0.46, z: 0.38 },
      ],
      [
        { x: 0.62, z: 0.17 },
        { x: 0.66, z: 0.28 },
        { x: 0.72, z: 0.39 },
      ],
      [
        { x: 0.24, z: 0.18 },
        { x: 0.46, z: 0.2 },
        { x: 0.72, z: 0.24 },
      ],
    ],
  },
  southVolcanicHighland: {
    width: 0.11,
    height: 42,
    path: [
      { x: 0.25, z: 0.79 },
      { x: 0.42, z: 0.75 },
      { x: 0.62, z: 0.78 },
      { x: 0.82, z: 0.88 },
    ],
    branches: [
      [
        { x: 0.47, z: 0.77 },
        { x: 0.5, z: 0.88 },
        { x: 0.54, z: 0.98 },
      ],
    ],
  },
  centralHills: {
    width: 0.055,
    height: 18,
    path: [
      { x: 0.28, z: 0.62 },
      { x: 0.4, z: 0.66 },
      { x: 0.58, z: 0.63 },
      { x: 0.7, z: 0.56 },
    ],
    branches: [],
  },
} as const;

export const FEATURE_CONFIG = {
  irregularRockPeaks: {
    count: 14,
    minHeight: 5,
    maxHeight: TERRAIN_SCALE_CONFIG.decorativePeakMaxHeight,
    minRadius: 2.4,
    maxRadius: TERRAIN_SCALE_CONFIG.decorativePeakMaxRadius,
  },
  iceCrystals: {
    count: 18,
    minHeight: 3.5,
    maxHeight: 9,
  },
  trees: {
    deciduousCount: 1120,
    coniferCount: 520,
    maxSlope: 0.42,
    minRiverDistanceHeightPenalty: 1.8,
  },
  sectModels: {
    detailScale: 1.45,
    haloSegments: 128,
    towerSegments: 36,
    domeSegments: 48,
  },
} as const;

export const DEBUG_CONFIG = {
  enabledByDefault: false,
  toggleKey: 'D',
} as const;
