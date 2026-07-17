import * as THREE from 'three';
import { SectDefinition } from '../data/regions';

export type LandmarkFallbackType = 'sect' | 'floating-island' | 'nature' | 'test';

export type LandmarkModelDefinition = {
  id: string;
  url: string;
  fallbackType: LandmarkFallbackType;
  defaultScale: number;
  rotationOffset?: number;
  verticalOffset?: number;
  groundEmbed?: number;
  lod?: {
    high?: string;
    medium?: string;
    low?: string;
  };
  castsShadow?: boolean;
  receivesShadow?: boolean;
  expectedBounds?: {
    width: number;
    height: number;
    depth: number;
  };
};

export type LandmarkBounds = {
  width: number;
  height: number;
  depth: number;
  minY: number;
  center: THREE.Vector3;
};

export type LandmarkInstance = {
  sect: SectDefinition;
  modelId: string;
  object: THREE.Object3D;
  fallback: THREE.Object3D | null;
  bounds: LandmarkBounds;
  usedExternalModel: boolean;
};

export type LandmarkFactoryStats = {
  registeredModelCount: number;
  requestedModelCount: number;
  loadedModelCount: number;
  failedModelCount: number;
  fallbackCount: number;
  instanceCount: number;
  boundsByModel: Record<string, { width: number; height: number; depth: number }>;
};
