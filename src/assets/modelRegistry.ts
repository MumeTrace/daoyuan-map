import { ASSET_CONFIG } from '../data/mapConfig';
import { LandmarkModelDefinition } from '../types/landmarks';

export const LANDMARK_MODEL_REGISTRY: Record<string, LandmarkModelDefinition> = {
  test_landmark: {
    id: 'test_landmark',
    url: `${ASSET_CONFIG.landmarkModelPath}/test_landmark.glb`,
    fallbackType: 'test',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0.08,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 16, height: 18, depth: 16 },
  },
  central_palace: {
    id: 'central_palace',
    url: `${ASSET_CONFIG.landmarkModelPath}/central_palace.glb`,
    fallbackType: 'sect',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0.12,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 36, height: 28, depth: 32 },
    lod: {
      high: `${ASSET_CONFIG.landmarkModelPath}/central_palace_high.glb`,
      medium: `${ASSET_CONFIG.landmarkModelPath}/central_palace_medium.glb`,
      low: `${ASSET_CONFIG.landmarkModelPath}/central_palace_low.glb`,
    },
  },
  floating_island_a: {
    id: 'floating_island_a',
    url: `${ASSET_CONFIG.landmarkModelPath}/floating_island_a.glb`,
    fallbackType: 'floating-island',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 70, height: 32, depth: 70 },
  },
  cc0_arch_banner: {
    id: 'cc0_arch_banner',
    url: `${ASSET_CONFIG.landmarkModelPath}/cc0/arch-banner.glb`,
    fallbackType: 'decoration',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0.02,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 5.2, height: 5.14, depth: 0.6 },
  },
  cc0_temple_shrine: {
    id: 'cc0_temple_shrine',
    url: `${ASSET_CONFIG.landmarkModelPath}/cc0/temple-shrine.glb`,
    fallbackType: 'decoration',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0.03,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 1.94, height: 3.57, depth: 1.44 },
  },
  cc0_crystal_cluster: {
    id: 'cc0_crystal_cluster',
    url: `${ASSET_CONFIG.landmarkModelPath}/cc0/crystal-cluster.glb`,
    fallbackType: 'decoration',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0.18,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 6.24, height: 15.48, depth: 6.76 },
  },
  cc0_crystal_base: {
    id: 'cc0_crystal_base',
    url: `${ASSET_CONFIG.landmarkModelPath}/cc0/crystal-base.glb`,
    fallbackType: 'decoration',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0.08,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 5.34, height: 1.44, depth: 4.85 },
  },
  cc0_dragon: {
    id: 'cc0_dragon',
    url: `${ASSET_CONFIG.landmarkModelPath}/cc0/dragon.glb`,
    fallbackType: 'decoration',
    defaultScale: 1,
    verticalOffset: 0,
    groundEmbed: 0,
    castsShadow: true,
    receivesShadow: true,
    expectedBounds: { width: 15.2, height: 12.6, depth: 29.7 },
  },
};

export function getLandmarkModelDefinition(id: string): LandmarkModelDefinition | undefined {
  return LANDMARK_MODEL_REGISTRY[id];
}

export function listLandmarkModelDefinitions(): LandmarkModelDefinition[] {
  return Object.values(LANDMARK_MODEL_REGISTRY);
}
