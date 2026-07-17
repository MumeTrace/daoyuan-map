import * as THREE from 'three';
import { BOUNDARY_CONFIG, TERRAIN_CONFIG } from '../data/mapConfig';
import { NormalizedPoint, REGIONS, RegionDefinition } from '../data/regions';
import { TerrainSampler } from '../terrain/TerrainSampler';

export class BoundaryBuilder {
  /** 创建贴合地形起伏的疆域边界线。 */
  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '疆域边界';
    group.visible = BOUNDARY_CONFIG.showRegionBoundariesByDefault;

    REGIONS.forEach((region) => {
      const line = this.createBoundaryLine(region, sampler);
      group.add(line);
    });

    return group;
  }

  private createBoundaryLine(region: RegionDefinition, sampler: TerrainSampler): THREE.Line {
    const points = this.interpolateBoundary(region.boundary).map((point) => {
      const position = sampler.sampleNormalized(point, TERRAIN_CONFIG.borderLift);
      return new THREE.Vector3(position.x, position.y, position.z);
    });
    points.push(points[0].clone());

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: region.highColor,
      transparent: true,
      opacity: 0.45,
      depthTest: true,
    });

    const line = new THREE.Line(geometry, material);
    line.name = `${region.name}疆域线`;
    return line;
  }

  private interpolateBoundary(boundary: NormalizedPoint[]): NormalizedPoint[] {
    const points: NormalizedPoint[] = [];

    for (let index = 0; index < boundary.length; index += 1) {
      const current = boundary[index];
      const next = boundary[(index + 1) % boundary.length];
      const distance = Math.hypot(next.x - current.x, next.z - current.z);
      const steps = Math.max(2, Math.ceil(distance / TERRAIN_CONFIG.borderSampleStep));

      for (let step = 0; step < steps; step += 1) {
        const t = step / steps;
        points.push({
          x: current.x + (next.x - current.x) * t,
          z: current.z + (next.z - current.z) * t,
        });
      }
    }

    return points;
  }
}
