import * as THREE from 'three';
import { TerrainSampler } from '../terrain/TerrainSampler';
import { VegetationSystem } from './VegetationSystem';

export class TreePrototypeFactory {
  private readonly vegetationSystem = new VegetationSystem();

  /** 保留旧入口：外层仍通过 buildForest 创建完整植被层。 */
  buildForest(sampler: TerrainSampler): THREE.Group {
    return this.vegetationSystem.build(sampler);
  }
}
