import * as THREE from 'three';
import { TERRAIN_CONFIG } from '../data/mapConfig';
import { TerrainContributions, TerrainHeight } from './TerrainHeight';
import { TerrainMaterial } from './TerrainMaterial';
import { TerrainSampler } from './TerrainSampler';

export type TerrainStats = {
  minHeight: number;
  maxHeight: number;
  averageHeight: number;
  maxAdjacentHeightDelta: number;
  terrainGenerationMs: number;
  regionWeightSumMin: number;
  regionWeightSumMax: number;
  regionWeightSumAverage: number;
  contributionMax: TerrainContributions;
  vertexCount: number;
  segments: number;
  worldWidth: number;
  worldDepth: number;
};

export type TerrainBuildResult = {
  mesh: THREE.Mesh;
  heightModel: TerrainHeight;
  sampler: TerrainSampler;
  stats: TerrainStats;
};

export class TerrainBuilder {
  private readonly heightModel = new TerrainHeight();
  private readonly terrainMaterial = new TerrainMaterial();

  /** 创建具有真实顶点高度和顶点颜色的玄天界地形。 */
  build(): TerrainBuildResult {
    const startedAt = performance.now();
    const geometry = new THREE.PlaneGeometry(
      TERRAIN_CONFIG.mapSize,
      TERRAIN_CONFIG.mapSize,
      TERRAIN_CONFIG.segments,
      TERRAIN_CONFIG.segments,
    );
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const heights = new Float32Array(position.count);
    const contributionMax = this.createContributionMax();
    let minHeight = Number.POSITIVE_INFINITY;
    let maxHeight = Number.NEGATIVE_INFINITY;
    let heightSum = 0;
    let regionWeightSumMin = Number.POSITIVE_INFINITY;
    let regionWeightSumMax = Number.NEGATIVE_INFINITY;
    let regionWeightSumTotal = 0;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const sample = this.heightModel.sample(x, z);
      position.setY(index, sample.height);
      heights[index] = sample.height;
      heightSum += sample.height;
      regionWeightSumMin = Math.min(regionWeightSumMin, sample.regionWeightSum);
      regionWeightSumMax = Math.max(regionWeightSumMax, sample.regionWeightSum);
      regionWeightSumTotal += sample.regionWeightSum;
      minHeight = Math.min(minHeight, sample.height);
      maxHeight = Math.max(maxHeight, sample.height);
      this.updateContributionMax(contributionMax, sample.contributions);
    }

    const maxAdjacentHeightDelta = this.calculateMaxAdjacentHeightDelta(heights);

    geometry.computeVertexNormals();

    const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const colors: number[] = [];

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const sample = this.heightModel.sample(x, z);
      const normal = new THREE.Vector3(normals.getX(index), normals.getY(index), normals.getZ(index));
      const color = this.terrainMaterial.getVertexColor(sample, normal, x, z);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
    if (uv) {
      geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uv.array), uv.itemSize));
    }
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.terrainMaterial.createMaterial());
    mesh.name = '玄天界程序化地形';
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    const terrainGenerationMs = performance.now() - startedAt;
    const stats: TerrainStats = {
      minHeight,
      maxHeight,
      averageHeight: heightSum / position.count,
      maxAdjacentHeightDelta,
      terrainGenerationMs,
      regionWeightSumMin,
      regionWeightSumMax,
      regionWeightSumAverage: regionWeightSumTotal / position.count,
      contributionMax,
      vertexCount: position.count,
      segments: TERRAIN_CONFIG.segments,
      worldWidth: TERRAIN_CONFIG.worldWidth,
      worldDepth: TERRAIN_CONFIG.worldDepth,
    };

    console.info('[玄天界地形统计]', {
      worldSize: `${stats.worldWidth}x${stats.worldDepth}`,
      segments: stats.segments,
      vertexCount: stats.vertexCount,
      minHeight: stats.minHeight.toFixed(2),
      maxHeight: stats.maxHeight.toFixed(2),
      averageHeight: stats.averageHeight.toFixed(2),
      maxAdjacentHeightDelta: stats.maxAdjacentHeightDelta.toFixed(2),
      terrainGenerationMs: stats.terrainGenerationMs.toFixed(1),
      regionWeightSum: `${stats.regionWeightSumMin.toFixed(2)} / ${stats.regionWeightSumAverage.toFixed(2)} / ${stats.regionWeightSumMax.toFixed(2)}`,
      contributionMax: stats.contributionMax,
    });

    return {
      mesh,
      heightModel: this.heightModel,
      sampler: new TerrainSampler(this.heightModel),
      stats,
    };
  }

  private createContributionMax(): TerrainContributions {
    return {
      macroHeight: 0,
      regionHeight: 0,
      mountainHeight: 0,
      ridgeHeight: 0,
      hillHeight: 0,
      volcanoHeight: 0,
      valleyDepth: 0,
      riverDepth: 0,
      erosionDepth: 0,
    };
  }

  private updateContributionMax(target: TerrainContributions, contributions: TerrainContributions): void {
    target.macroHeight = Math.max(target.macroHeight, Math.abs(contributions.macroHeight));
    target.regionHeight = Math.max(target.regionHeight, Math.abs(contributions.regionHeight));
    target.mountainHeight = Math.max(target.mountainHeight, Math.abs(contributions.mountainHeight));
    target.ridgeHeight = Math.max(target.ridgeHeight, Math.abs(contributions.ridgeHeight));
    target.hillHeight = Math.max(target.hillHeight, Math.abs(contributions.hillHeight));
    target.volcanoHeight = Math.max(target.volcanoHeight, Math.abs(contributions.volcanoHeight));
    target.valleyDepth = Math.max(target.valleyDepth, Math.abs(contributions.valleyDepth));
    target.riverDepth = Math.max(target.riverDepth, Math.abs(contributions.riverDepth));
    target.erosionDepth = Math.max(target.erosionDepth, Math.abs(contributions.erosionDepth));
  }

  private calculateMaxAdjacentHeightDelta(heights: Float32Array): number {
    const rowSize = TERRAIN_CONFIG.segments + 1;
    let maxDelta = 0;

    for (let row = 0; row < rowSize; row += 1) {
      for (let column = 0; column < rowSize; column += 1) {
        const index = row * rowSize + column;
        if (column + 1 < rowSize) {
          maxDelta = Math.max(maxDelta, Math.abs(heights[index] - heights[index + 1]));
        }
        if (row + 1 < rowSize) {
          maxDelta = Math.max(maxDelta, Math.abs(heights[index] - heights[index + rowSize]));
        }
      }
    }

    return maxDelta;
  }
}
