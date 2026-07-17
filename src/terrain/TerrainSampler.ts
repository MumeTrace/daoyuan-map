import { NormalizedPoint } from '../data/regions';
import { normalizedToWorld } from '../utils/MapCoordinateSystem';
import { TerrainHeight, TerrainSample } from './TerrainHeight';

export class TerrainSampler {
  constructor(private readonly heightModel: TerrainHeight) {}

  /** 将 0～1 地图坐标转换为 Three.js 世界坐标。 */
  normalizedToWorld(point: NormalizedPoint): { x: number; z: number } {
    return normalizedToWorld(point);
  }

  /** 从地形高度模型中采样指定世界坐标的 Y 值。 */
  sampleHeight(worldX: number, worldZ: number): number {
    return this.heightModel.sample(worldX, worldZ).height;
  }

  /** 采样完整地形信息，供树木/调试等对象判断坡度、河流和熔岩。 */
  sampleDetails(worldX: number, worldZ: number): TerrainSample {
    return this.heightModel.sample(worldX, worldZ);
  }

  /** 用相邻高度差估算坡度，数值越大表示越陡。 */
  sampleSlope(worldX: number, worldZ: number, step = 2.4): number {
    const left = this.sampleHeight(worldX - step, worldZ);
    const right = this.sampleHeight(worldX + step, worldZ);
    const down = this.sampleHeight(worldX, worldZ - step);
    const up = this.sampleHeight(worldX, worldZ + step);
    return Math.hypot(right - left, up - down) / (step * 2);
  }

  /** 直接采样归一化地图坐标对应的地表位置。 */
  sampleNormalized(point: NormalizedPoint, lift = 0): { x: number; y: number; z: number } {
    const world = this.normalizedToWorld(point);
    return {
      x: world.x,
      y: this.sampleHeight(world.x, world.z) + lift,
      z: world.z,
    };
  }
}
