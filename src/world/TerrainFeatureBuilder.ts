import * as THREE from 'three';
import { SnowEffect } from '../effects/SnowEffect';
import { VolcanoEffect } from '../effects/VolcanoEffect';
import { BOUNDARY_CONFIG, FEATURE_CONFIG, TERRAIN_SCALE_CONFIG, TERRAIN_TEXTURE_CONFIG } from '../data/mapConfig';
import { NormalizedPoint } from '../data/regions';
import { TerrainSampler } from '../terrain/TerrainSampler';
import { IrregularRockPeakBuilder } from './IrregularRockPeakBuilder';
import { TreePrototypeFactory } from './TreePrototypeFactory';

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pointOnPath(path: NormalizedPoint[], t: number): NormalizedPoint {
  const scaled = t * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const localT = scaled - index;
  const current = path[index];
  const next = path[index + 1];
  return {
    x: lerp(current.x, next.x, localT),
    z: lerp(current.z, next.z, localT),
  };
}

export class TerrainFeatureBuilder {
  private readonly random = createSeededRandom(20260716 + 911);
  private readonly rockPeakBuilder = new IrregularRockPeakBuilder();
  private readonly treeFactory = new TreePrototypeFactory();
  private readonly volcanoEffect = new VolcanoEffect();
  private readonly snowEffect = new SnowEffect();

  /** 创建地貌细节层。主要山脉由地形顶点高度承担，这里只放少量风格化装饰。 */
  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '地貌细节层';
    group.add(this.createFloatingSectIsland(sampler));
    group.add(this.createIrregularPeaks(sampler));
    group.add(this.treeFactory.buildForest(sampler));
    if (TERRAIN_TEXTURE_CONFIG.terrainLineDebugMode === 'geometry-lines-only' || TERRAIN_TEXTURE_CONFIG.terrainLineDebugMode === 'roads-only') {
      group.add(this.createDuneCrests(sampler));
    }
    if (TERRAIN_TEXTURE_CONFIG.terrainLineDebugMode !== 'hide-all-lines' && TERRAIN_TEXTURE_CONFIG.terrainLineDebugMode !== 'boundaries-only') {
      group.add(this.createLavaCracks(sampler));
    }
    group.add(this.snowEffect.build(sampler));
    group.add(this.volcanoEffect.build(sampler));
    return group;
  }

  private createFloatingSectIsland(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '星道宗悬浮仙岛地基';
    const base = sampler.sampleNormalized({ x: 0.52, z: 0.49 }, 0);
    const islandY = base.y + 76;

    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f9d69,
      roughness: 0.78,
      metalness: 0.02,
    });
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x6c7480,
      roughness: 0.86,
      metalness: 0.04,
    });
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8b076,
      roughness: 0.55,
      metalness: 0.18,
    });

    const top = new THREE.Mesh(new THREE.CylinderGeometry(24, 22, 3.6, 128), topMaterial);
    top.name = '悬浮仙岛上层地面';
    top.position.set(base.x, islandY, base.z);

    const underside = this.rockPeakBuilder.buildPeak({
      height: 24,
      radius: 18,
      rings: 9,
      segments: 32,
      color: 0x6c7480,
      topColor: 0xb6c2c8,
      seed: 3301,
    });
    underside.name = '悬浮仙岛倒悬岩基';
    underside.rotation.x = Math.PI;
    underside.position.set(base.x, islandY - 2.4, base.z);

    const lowerRock = new THREE.Mesh(new THREE.CylinderGeometry(15, 6, 8, 96, 5), rockMaterial);
    lowerRock.name = '悬浮仙岛收束岩盘';
    lowerRock.position.set(base.x, islandY - 6.2, base.z);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(25, 0.55, 12, 128), rimMaterial);
    ring.name = '悬浮仙岛边缘';
    ring.rotation.x = Math.PI / 2;
    ring.position.set(base.x, islandY + 2.0, base.z);

    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(28, 0.08, 8, 160),
      new THREE.MeshStandardMaterial({
        color: 0xa9efff,
        emissive: 0x75dfff,
        emissiveIntensity: 0.75,
        roughness: 0.35,
        transparent: true,
        opacity: 0.82,
      }),
    );
    glowRing.name = '悬浮仙岛灵光环';
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.set(base.x, islandY - 7.6, base.z);

    group.add(underside, lowerRock, top, ring, glowRing);
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return group;
  }

  private createIrregularPeaks(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '少量不规则岩峰与冰晶峰';
    const total = FEATURE_CONFIG.irregularRockPeaks.count + FEATURE_CONFIG.iceCrystals.count;

    for (let index = 0; index < total; index += 1) {
      const isIce = index >= FEATURE_CONFIG.irregularRockPeaks.count;
      const nx = isIce ? lerp(0.25, 0.72, this.random()) : lerp(0.72, 0.97, this.random());
      const nz = isIce ? lerp(0.06, 0.32, this.random()) : lerp(0.12, 0.82, this.random());
      const sampled = sampler.sampleNormalized({ x: nx, z: nz }, -1.2);
      const height = Math.min(
        TERRAIN_SCALE_CONFIG.decorativePeakMaxHeight,
        isIce
          ? lerp(FEATURE_CONFIG.iceCrystals.minHeight, FEATURE_CONFIG.iceCrystals.maxHeight, this.random())
          : lerp(FEATURE_CONFIG.irregularRockPeaks.minHeight, FEATURE_CONFIG.irregularRockPeaks.maxHeight, this.random()),
      );
      const radius = Math.min(
        TERRAIN_SCALE_CONFIG.decorativePeakMaxRadius,
        isIce
          ? lerp(1.4, 3.4, this.random())
          : lerp(FEATURE_CONFIG.irregularRockPeaks.minRadius, FEATURE_CONFIG.irregularRockPeaks.maxRadius, this.random()),
      );
      const peak = this.rockPeakBuilder.buildPeak({
        height,
        radius,
        rings: isIce ? 6 : 8,
        segments: isIce ? 12 : 16,
        color: isIce ? 0x9ed7ef : 0x58636c,
        topColor: isIce ? 0xe6fbff : 0xb7c4cc,
        seed: 8000 + index,
      });
      peak.name = isIce ? '北冥不规则冰晶峰' : '无尽山脉不规则岩峰';
      peak.position.set(sampled.x, sampled.y - Math.min(2.2, height * 0.16), sampled.z);
      peak.rotation.y = this.random() * Math.PI * 2;
      group.add(peak);
    }

    return group;
  }

  private createDuneCrests(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '叹息沙海沙丘脊线';
    const material = new THREE.LineBasicMaterial({
      color: 0xb99358,
      transparent: true,
      opacity: BOUNDARY_CONFIG.roadOpacity,
      depthTest: true,
    });

    for (let row = 0; row < 26; row += 1) {
      const points: THREE.Vector3[] = [];
      const baseZ = lerp(0.32, 0.78, row / 25);
      const startX = lerp(0.05, 0.18, this.random());
      const endX = lerp(0.24, 0.38, this.random());
      for (let step = 0; step <= 42; step += 1) {
        const t = step / 42;
        const nx = lerp(startX, endX, t);
        const nz = baseZ + Math.sin(t * Math.PI * 2 + row * 0.65) * 0.014;
        const sampled = sampler.sampleNormalized({ x: nx, z: nz }, 1.1);
        points.push(new THREE.Vector3(sampled.x, sampled.y, sampled.z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.name = '沙丘脊';
      group.add(line);
    }

    return group;
  }

  private createLavaCracks(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '南离熔岩裂谷光线';
    const material = new THREE.LineBasicMaterial({
      color: 0xd95a24,
      transparent: true,
      opacity: BOUNDARY_CONFIG.lavaCrackOpacity,
      depthTest: true,
    });
    const paths: NormalizedPoint[][] = [
      [
        { x: 0.56, z: 0.84 },
        { x: 0.51, z: 0.875 },
        { x: 0.44, z: 0.915 },
      ],
      [
        { x: 0.56, z: 0.84 },
        { x: 0.605, z: 0.868 },
        { x: 0.67, z: 0.892 },
      ],
      [
        { x: 0.56, z: 0.84 },
        { x: 0.572, z: 0.9 },
        { x: 0.57, z: 0.96 },
      ],
    ];

    paths.forEach((path) => {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 80; step += 1) {
        const point = pointOnPath(path, step / 80);
        const sampled = sampler.sampleNormalized(point, 2.1);
        points.push(new THREE.Vector3(sampled.x, sampled.y, sampled.z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.name = '熔岩裂谷';
      group.add(line);
    });

    return group;
  }
}
