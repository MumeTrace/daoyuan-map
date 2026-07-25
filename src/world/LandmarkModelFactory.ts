import * as THREE from 'three';
import { AssetManager } from '../assets/AssetManager';
import { getLandmarkModelDefinition, LANDMARK_MODEL_REGISTRY } from '../assets/modelRegistry';
import { resolveAssetUrl } from '../assets/AssetUrlResolver';
import { ASSET_CONFIG, RENDER_QUALITY_CONFIG } from '../data/mapConfig';
import { SECTS, SectDefinition } from '../data/regions';
import { TerrainSampler } from '../terrain/TerrainSampler';
import { LandmarkFactoryStats, LandmarkInstance, LandmarkModelDefinition } from '../types/landmarks';

export class LandmarkModelFactory {
  private disposed = false;
  private readonly instances: LandmarkInstance[] = [];
  private readonly stats: LandmarkFactoryStats = {
    registeredModelCount: Object.keys(LANDMARK_MODEL_REGISTRY).length,
    requestedModelCount: 0,
    loadedModelCount: 0,
    failedModelCount: 0,
    fallbackCount: 0,
    instanceCount: 0,
    boundsByModel: {},
  };

  constructor(private readonly assetManager: AssetManager) {}

  installExternalSectModels(sectLayer: THREE.Group, sampler: TerrainSampler): void {
    sectLayer.userData.landmarkStats = this.stats;

    if (!this.shouldUseExternalModels()) {
      this.stats.fallbackCount += SECTS.filter((sect) => sect.landmarkModelId).length;
      console.info('[玄天界 GLB 地标] 外部模型已关闭或低质量强制程序模型。');
      return;
    }

    SECTS.filter((sect) => Boolean(sect.landmarkModelId)).forEach((sect) => {
      const fallback = this.findFallbackGroup(sectLayer, sect.id);
      this.loadAndReplaceSectModel(sect, fallback, sectLayer, sampler);
    });
    SECTS.forEach((sect) => {
      const fallback = this.findFallbackGroup(sectLayer, sect.id);
      sect.externalDecorations?.forEach((decoration, index) => {
        this.loadSectDecoration(sect, decoration, index, fallback, sectLayer, sampler);
      });
    });
  }

  dispose(): void {
    this.disposed = true;
    this.instances.length = 0;
  }

  getStats(): LandmarkFactoryStats {
    return {
      ...this.stats,
      boundsByModel: { ...this.stats.boundsByModel },
    };
  }

  private async loadAndReplaceSectModel(
    sect: SectDefinition,
    fallback: THREE.Object3D | null,
    parent: THREE.Group,
    sampler: TerrainSampler,
  ): Promise<void> {
    const modelId = sect.landmarkModelId;
    if (!modelId) {
      return;
    }

    const definition = getLandmarkModelDefinition(modelId);
    if (!definition) {
      this.stats.failedModelCount += 1;
      this.stats.fallbackCount += 1;
      console.warn('[玄天界 GLB 地标] 未注册模型，使用程序模型降级。', { sect: sect.name, modelId });
      return;
    }

    this.stats.requestedModelCount += 1;
    try {
      const object = await this.assetManager.createModelInstance(modelId);
      if (this.disposed) {
        return;
      }

      const instance = this.placeModel(sect, definition, object, fallback, sampler);
      if (fallback) {
        fallback.visible = false;
      }
      parent.add(instance.object);
      this.instances.push(instance);
      this.stats.loadedModelCount += 1;
      this.stats.instanceCount = this.instances.length;
      this.stats.boundsByModel[modelId] = {
        width: Number(instance.bounds.width.toFixed(2)),
        height: Number(instance.bounds.height.toFixed(2)),
        depth: Number(instance.bounds.depth.toFixed(2)),
      };
      parent.userData.landmarkStats = this.getStats();
      console.info('[玄天界 GLB 地标] 已替换程序模型', {
        sect: sect.name,
        modelId,
        bounds: this.stats.boundsByModel[modelId],
      });
    } catch (error) {
      if (this.disposed) {
        return;
      }
      if (fallback) {
        fallback.visible = true;
      }
      this.stats.failedModelCount += 1;
      this.stats.fallbackCount += 1;
      parent.userData.landmarkStats = this.getStats();
      console.warn('[玄天界 GLB 地标] 加载失败，使用程序模型降级。', {
        sect: sect.name,
        modelId,
        url: resolveAssetUrl(definition.url),
        fallbackType: definition.fallbackType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async loadSectDecoration(
    sect: SectDefinition,
    decoration: NonNullable<SectDefinition['externalDecorations']>[number],
    index: number,
    fallback: THREE.Object3D | null,
    parent: THREE.Group,
    sampler: TerrainSampler,
  ): Promise<void> {
    const definition = getLandmarkModelDefinition(decoration.modelId);
    if (!definition) {
      this.stats.failedModelCount += 1;
      console.warn('[玄天界 GLB 装饰] 未注册模型。', { sect: sect.name, modelId: decoration.modelId });
      return;
    }

    this.stats.requestedModelCount += 1;
    try {
      const object = await this.assetManager.createModelInstance(decoration.modelId);
      if (this.disposed) {
        return;
      }

      object.name = `${sect.name}_${decoration.modelId}_装饰_${index + 1}`;
      object.userData.sectId = sect.id;
      object.userData.landmarkModelId = decoration.modelId;
      object.scale.setScalar(decoration.scale * definition.defaultScale);
      object.rotation.y = decoration.rotationY ?? 0;
      this.applyShadowPolicy(object, definition);

      const box = new THREE.Box3().setFromObject(object);
      const bounds = this.boxToBounds(box);
      object.position.set(
        decoration.offset.x,
        decoration.offset.y - bounds.minY + (definition.verticalOffset ?? 0) - (definition.groundEmbed ?? 0),
        decoration.offset.z,
      );

      if (fallback) {
        fallback.add(object);
      } else {
        const sampled = sampler.sampleNormalized(sect.position, sect.kind === 'star' ? 78 : 0.08);
        object.position.add(new THREE.Vector3(sampled.x, sampled.y, sampled.z));
        parent.add(object);
      }

      const instance: LandmarkInstance = {
        sect,
        modelId: definition.id,
        object,
        fallback,
        bounds,
        usedExternalModel: true,
      };
      this.instances.push(instance);
      this.stats.loadedModelCount += 1;
      this.stats.instanceCount = this.instances.length;
      this.stats.boundsByModel[`${decoration.modelId}:${index}`] = {
        width: Number(bounds.width.toFixed(2)),
        height: Number(bounds.height.toFixed(2)),
        depth: Number(bounds.depth.toFixed(2)),
      };
      parent.userData.landmarkStats = this.getStats();
    } catch (error) {
      if (this.disposed) {
        return;
      }
      this.stats.failedModelCount += 1;
      parent.userData.landmarkStats = this.getStats();
      console.warn('[玄天界 GLB 装饰] 加载失败，保留程序宗门。', {
        sect: sect.name,
        modelId: decoration.modelId,
        url: resolveAssetUrl(definition.url),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private placeModel(
    sect: SectDefinition,
    definition: LandmarkModelDefinition,
    object: THREE.Object3D,
    fallback: THREE.Object3D | null,
    sampler: TerrainSampler,
  ): LandmarkInstance {
    object.name = `${sect.name}_${definition.id}_外部地标`;
    object.userData.sectId = sect.id;
    object.userData.landmarkModelId = definition.id;
    object.scale.setScalar(definition.defaultScale);
    object.rotation.y = (fallback?.rotation.y ?? (sect.position.x * 17 + sect.position.z * 29) % (Math.PI * 2)) + (definition.rotationOffset ?? 0);

    this.applyShadowPolicy(object, definition);

    const modelBox = new THREE.Box3().setFromObject(object);
    const bounds = this.boxToBounds(modelBox);
    const lift = sect.kind === 'star' ? 78 : 0.08;
    const sampled = sampler.sampleNormalized(sect.position, lift);
    object.position.set(sampled.x, sampled.y - bounds.minY + (definition.verticalOffset ?? 0) - (definition.groundEmbed ?? 0), sampled.z);

    return {
      sect,
      modelId: definition.id,
      object,
      fallback,
      bounds,
      usedExternalModel: true,
    };
  }

  private applyShadowPolicy(object: THREE.Object3D, definition: LandmarkModelDefinition): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = definition.castsShadow ?? true;
        mesh.receiveShadow = definition.receivesShadow ?? true;
      }
    });
  }

  private boxToBounds(box: THREE.Box3): LandmarkInstance['bounds'] {
    const size = box.getSize(new THREE.Vector3());
    return {
      width: size.x,
      height: size.y,
      depth: size.z,
      minY: box.min.y,
      center: box.getCenter(new THREE.Vector3()),
    };
  }

  private findFallbackGroup(sectLayer: THREE.Group, sectId: string): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    sectLayer.traverse((object) => {
      if (!found && object.userData.sectId === sectId) {
        found = object;
      }
    });
    return found;
  }

  private shouldUseExternalModels(): boolean {
    if (!ASSET_CONFIG.useExternalModels) {
      return false;
    }
    const renderQuality: string = RENDER_QUALITY_CONFIG.default;
    if (ASSET_CONFIG.forceProceduralModelsInLowQuality && renderQuality === 'low') {
      return false;
    }
    return true;
  }
}
