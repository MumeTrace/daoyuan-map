import * as THREE from 'three';
import { AssetManager } from '../assets/AssetManager';
import { TerrainBuilder, TerrainBuildResult } from '../terrain/TerrainBuilder';
import { BoundaryBuilder } from './BoundaryBuilder';
import { LandmarkModelFactory } from './LandmarkModelFactory';
import { RegionalLandmarkBuilder } from './RegionalLandmarkBuilder';
import { RegionLabelBuilder } from './RegionLabelBuilder';
import { SectModelBuilder } from './SectModelBuilder';
import { TerrainFeatureBuilder } from './TerrainFeatureBuilder';

export type WorldBuildResult = TerrainBuildResult & {
  root: THREE.Group;
};

export class WorldBuilder {
  private readonly terrainBuilder = new TerrainBuilder();
  private readonly boundaryBuilder = new BoundaryBuilder();
  private readonly labelBuilder = new RegionLabelBuilder();
  private readonly featureBuilder = new TerrainFeatureBuilder();
  private readonly regionalLandmarkBuilder = new RegionalLandmarkBuilder();
  private readonly sectModelBuilder = new SectModelBuilder();
  private readonly landmarkModelFactory: LandmarkModelFactory | null;

  constructor(assetManager?: AssetManager) {
    this.landmarkModelFactory = assetManager ? new LandmarkModelFactory(assetManager) : null;
  }

  /** 组装 Phase 2 世界：地形、区域名称和疆域边界。 */
  build(): WorldBuildResult {
    const root = new THREE.Group();
    root.name = '玄天界世界根节点';

    const terrain = this.terrainBuilder.build();
    const sectLayer = this.sectModelBuilder.build(terrain.sampler);
    root.add(terrain.mesh);
    root.add(this.featureBuilder.build(terrain.sampler));
    root.add(this.regionalLandmarkBuilder.build(terrain.sampler));
    root.add(sectLayer);
    root.add(this.boundaryBuilder.build(terrain.sampler));
    root.add(this.labelBuilder.build(terrain.sampler));
    this.landmarkModelFactory?.installExternalSectModels(sectLayer, terrain.sampler);

    return {
      ...terrain,
      root,
    };
  }

  dispose(): void {
    this.landmarkModelFactory?.dispose();
  }
}
