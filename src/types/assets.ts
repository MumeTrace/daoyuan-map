import * as THREE from 'three';

export type AssetLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export type AssetLoadProgress = {
  requested: number;
  completed: number;
  failed: number;
  cacheHits: number;
  currentModelId: string | null;
  currentUrl: string | null;
  startedAt: number;
  totalElapsedMs: number;
  maxSingleModelLoadMs: number;
};

export type LoadedModel = {
  id: string;
  url: string;
  scene: THREE.Object3D;
  loadedAt: number;
  loadMs: number;
  bounds: {
    width: number;
    height: number;
    depth: number;
    minY: number;
    center: THREE.Vector3;
  };
};

export type PreloadResult = {
  requested: string[];
  loaded: string[];
  failed: Array<{ id: string; error: string }>;
};
