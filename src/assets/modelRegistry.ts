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
};

export function getLandmarkModelDefinition(id: string): LandmarkModelDefinition | undefined {
  return LANDMARK_MODEL_REGISTRY[id];
}

export function listLandmarkModelDefinitions(): LandmarkModelDefinition[] {
  return Object.values(LANDMARK_MODEL_REGISTRY);
}
