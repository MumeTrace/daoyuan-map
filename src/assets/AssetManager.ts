import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ASSET_CONFIG } from '../data/mapConfig';
import { getHostWindow } from '../host/hostDom';
import { AssetLoadProgress, LoadedModel, PreloadResult } from '../types/assets';
import { LandmarkModelDefinition } from '../types/landmarks';
import { resolveAssetUrl } from './AssetUrlResolver';
import { getLandmarkModelDefinition } from './modelRegistry';

type AssetManagerOptions = {
  renderer?: THREE.WebGLRenderer;
};

type DisposableMaterial = THREE.Material & {
  map?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
};

function boxToBounds(box: THREE.Box3): LoadedModel['bounds'] {
  const size = box.getSize(new THREE.Vector3());
  return {
    width: size.x,
    height: size.y,
    depth: size.z,
    minY: box.min.y,
    center: box.getCenter(new THREE.Vector3()),
  };
}

function hasSkinnedMesh(root: THREE.Object3D): boolean {
  let skinned = false;
  root.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
      skinned = true;
    }
  });
  return skinned;
}

export class AssetManager {
  private readonly loader = new GLTFLoader();
  private readonly modelPromises = new Map<string, Promise<LoadedModel>>();
  private readonly loadedModels = new Map<string, LoadedModel>();
  private readonly requestedUrls = new Set<string>();
  private readonly progress: AssetLoadProgress = {
    requested: 0,
    completed: 0,
    failed: 0,
    cacheHits: 0,
    currentModelId: null,
    currentUrl: null,
    startedAt: performance.now(),
    totalElapsedMs: 0,
    maxSingleModelLoadMs: 0,
  };

  private dracoLoader: DRACOLoader | null = null;
  private ktx2Loader: KTX2Loader | null = null;
  private disposed = false;

  constructor(options: AssetManagerOptions = {}) {
    if (ASSET_CONFIG.enableDraco) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(resolveAssetUrl(`${ASSET_CONFIG.decoderPath}/draco/`));
      this.loader.setDRACOLoader(this.dracoLoader);
    }

    if (ASSET_CONFIG.enableKtx2 && options.renderer) {
      this.ktx2Loader = new KTX2Loader();
      this.ktx2Loader.setTranscoderPath(resolveAssetUrl(`${ASSET_CONFIG.decoderPath}/basis/`));
      this.ktx2Loader.detectSupport(options.renderer);
      this.loader.setKTX2Loader(this.ktx2Loader);
    }
  }

  async loadModel(id: string): Promise<LoadedModel> {
    if (this.disposed) {
      throw new Error(`AssetManager 已释放，无法加载模型：${id}`);
    }

    const definition = this.requireDefinition(id);
    const url = resolveAssetUrl(definition.url);
    const cached = this.loadedModels.get(id);
    if (cached) {
      this.progress.cacheHits += 1;
      return cached;
    }

    const cachedPromise = this.modelPromises.get(id);
    if (cachedPromise) {
      this.progress.cacheHits += 1;
      return cachedPromise;
    }

    this.progress.requested += 1;
    this.requestedUrls.add(url);
    this.progress.currentModelId = id;
    this.progress.currentUrl = url;

    const promise = this.loadModelFromUrl(id, url, definition)
      .then((model) => {
        if (this.disposed) {
          throw new Error(`模型 ${id} 已加载，但地图已关闭，取消应用结果。`);
        }
        this.loadedModels.set(id, model);
        this.progress.completed += 1;
        this.progress.totalElapsedMs = performance.now() - this.progress.startedAt;
        return model;
      })
      .catch((error) => {
        this.progress.failed += 1;
        this.progress.totalElapsedMs = performance.now() - this.progress.startedAt;
        throw error;
      });

    this.modelPromises.set(id, promise);
    return promise;
  }

  async preload(ids: string[]): Promise<PreloadResult> {
    const results = await Promise.allSettled(ids.map((id) => this.loadModel(id)));
    return {
      requested: ids,
      loaded: ids.filter((_id, index) => results[index].status === 'fulfilled'),
      failed: ids
        .map((id, index) => ({ id, result: results[index] }))
        .filter((item): item is { id: string; result: PromiseRejectedResult } => item.result.status === 'rejected')
        .map((item) => ({ id: item.id, error: item.result.reason instanceof Error ? item.result.reason.message : String(item.result.reason) })),
    };
  }

  async createModelInstance(id: string): Promise<THREE.Object3D> {
    const model = await this.loadModel(id);
    const source = model.scene;
    const instance = hasSkinnedMesh(source) ? cloneSkeleton(source) : source.clone(true);
    instance.name = `${id}_external_instance`;
    instance.userData.assetModelId = id;
    instance.traverse((object) => {
      object.userData.skipResourceDisposal = true;
    });
    return instance;
  }

  has(id: string): boolean {
    return this.loadedModels.has(id);
  }

  getProgress(): AssetLoadProgress {
    return {
      ...this.progress,
      totalElapsedMs: performance.now() - this.progress.startedAt,
    };
  }

  getRequestedUrlCount(): number {
    return this.requestedUrls.size;
  }

  dispose(): void {
    this.disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    this.loadedModels.forEach((model) => {
      model.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          geometries.add(mesh.geometry);
        }
        const material = mesh.material as DisposableMaterial | DisposableMaterial[] | undefined;
        if (Array.isArray(material)) {
          material.forEach((item) => this.collectMaterial(item, materials, textures));
        } else if (material) {
          this.collectMaterial(material, materials, textures);
        }
      });
    });

    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    this.loadedModels.clear();
    this.modelPromises.clear();
    this.dracoLoader?.dispose();
    this.ktx2Loader?.dispose();
    this.dracoLoader = null;
    this.ktx2Loader = null;
  }

  private requireDefinition(id: string): LandmarkModelDefinition {
    const definition = getLandmarkModelDefinition(id);
    if (!definition) {
      throw new Error(`未注册的地标模型：${id}`);
    }
    return definition;
  }

  private async loadModelFromUrl(id: string, url: string, definition: LandmarkModelDefinition): Promise<LoadedModel> {
    const startedAt = performance.now();
    const gltf = await this.withTimeout(this.loader.loadAsync(url), id, url);
    const loadMs = performance.now() - startedAt;
    this.progress.maxSingleModelLoadMs = Math.max(this.progress.maxSingleModelLoadMs, loadMs);
    const scene = this.prepareSourceScene(gltf, id);
    const bounds = boxToBounds(new THREE.Box3().setFromObject(scene));
    this.warnIfBoundsLookWrong(id, url, definition, bounds);
    console.info('[玄天界 GLB 模型加载成功]', {
      id,
      url,
      loadMs: loadMs.toFixed(1),
      bounds: {
        width: bounds.width.toFixed(2),
        height: bounds.height.toFixed(2),
        depth: bounds.depth.toFixed(2),
      },
    });
    return {
      id,
      url,
      scene,
      loadedAt: performance.now(),
      loadMs,
      bounds,
    };
  }

  private prepareSourceScene(gltf: GLTF, id: string): THREE.Object3D {
    const scene = gltf.scene || gltf.scenes[0];
    if (!scene) {
      throw new Error(`模型 ${id} 不包含 scene。`);
    }
    scene.name = `${id}_external_source`;
    scene.traverse((object) => {
      object.userData.assetSourceModelId = id;
    });
    return scene;
  }

  private withTimeout(promise: Promise<GLTF>, id: string, url: string): Promise<GLTF> {
    const hostWindow = getHostWindow();
    return new Promise((resolve, reject) => {
      const timeout = hostWindow.setTimeout(() => {
        reject(new Error(`模型加载超时：${id} ${url} (${ASSET_CONFIG.modelLoadTimeoutMs}ms)`));
      }, ASSET_CONFIG.modelLoadTimeoutMs);

      promise.then(
        (value) => {
          hostWindow.clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          hostWindow.clearTimeout(timeout);
          reject(error);
        },
      );
    });
  }

  private collectMaterial(material: DisposableMaterial, materials: Set<THREE.Material>, textures: Set<THREE.Texture>): void {
    materials.add(material);
    if (material.map) textures.add(material.map);
    if (material.emissiveMap) textures.add(material.emissiveMap);
    if (material.normalMap) textures.add(material.normalMap);
    if (material.roughnessMap) textures.add(material.roughnessMap);
    if (material.metalnessMap) textures.add(material.metalnessMap);
    if (material.aoMap) textures.add(material.aoMap);
  }

  private warnIfBoundsLookWrong(id: string, url: string, definition: LandmarkModelDefinition, bounds: LoadedModel['bounds']): void {
    const expected = definition.expectedBounds;
    if (!expected) {
      return;
    }

    const warnings: string[] = [];
    if (bounds.height < expected.height * 0.2) warnings.push(`高度过小 ${bounds.height.toFixed(2)}`);
    if (bounds.height > expected.height * 3.2) warnings.push(`高度过大 ${bounds.height.toFixed(2)}`);
    if (bounds.width > expected.width * 4 || bounds.depth > expected.depth * 4) warnings.push('水平尺寸异常大');
    if (Math.abs(bounds.center.x) > expected.width || Math.abs(bounds.center.z) > expected.depth) warnings.push('模型中心远离原点');
    if (Math.abs(bounds.minY) > Math.max(1, expected.height * 0.18)) warnings.push(`原点不在底部附近 minY=${bounds.minY.toFixed(2)}`);

    if (warnings.length > 0) {
      console.warn('[玄天界 GLB 模型尺寸警告]', { id, url, warnings, bounds, expected });
    }
  }
}
