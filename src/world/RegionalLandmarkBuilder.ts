import * as THREE from 'three';
import { REGIONAL_TERRAIN_CONFIG, TERRAIN_CONFIG } from '../data/mapConfig';
import { NormalizedPoint } from '../data/regions';
import { TerrainSampler } from '../terrain/TerrainSampler';

function seededRandom(seed: number): () => number {
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

export class RegionalLandmarkBuilder {
  private readonly random = seededRandom(20260725);

  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '四域参考图地貌地标层';
    group.add(this.createBloodSea(sampler));
    group.add(this.createNorthAbyss(sampler));
    group.add(this.createEasternRivers(sampler));
    group.add(this.createWorldTree(sampler));
    group.add(this.createBuddhaStupaForest(sampler));
    return group;
  }

  private createBloodSea(sampler: TerrainSampler): THREE.Mesh {
    const config = REGIONAL_TERRAIN_CONFIG.south;
    const geometry = this.createConformingEllipse(
      sampler,
      config.bloodSeaCenter,
      config.bloodSeaRadius.x * 0.92,
      config.bloodSeaRadius.z * 0.88,
      0.18,
      15,
      128,
      1.15,
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x8f2018,
      emissive: 0x5b0d08,
      emissiveIntensity: 0.56,
      roughness: 0.42,
      metalness: 0.04,
      transparent: true,
      opacity: 0.88,
      vertexColors: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = '南离不枯血海地表';
    mesh.receiveShadow = true;
    return mesh;
  }

  private createNorthAbyss(sampler: TerrainSampler): THREE.Mesh {
    const geometry = this.createConformingEllipse(
      sampler,
      { x: 0.56, z: 0.355 },
      0.062,
      0.031,
      0,
      11,
      128,
      1.2,
    );
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x15394f,
      emissive: 0x081c2b,
      emissiveIntensity: 0.22,
      roughness: 0.22,
      metalness: 0.06,
      transparent: true,
      opacity: 0.76,
      clearcoat: 0.55,
      clearcoatRoughness: 0.28,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = '北冥绝迹冰谷深渊';
    mesh.receiveShadow = true;
    return mesh;
  }

  private createEasternRivers(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '东极青木域水系';
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x326d68,
      emissive: 0x102d2d,
      emissiveIntensity: 0.08,
      roughness: 0.34,
      metalness: 0,
      transparent: true,
      opacity: 0.54,
      clearcoat: 0.34,
      clearcoatRoughness: 0.34,
      side: THREE.DoubleSide,
    });
    const paths: NormalizedPoint[][] = [
      [
        { x: 0.86, z: 0.39 },
        { x: 0.82, z: 0.49 },
        { x: 0.78, z: 0.59 },
        { x: 0.73, z: 0.69 },
      ],
    ];
    paths.forEach((path, index) => {
      const river = new THREE.Mesh(this.createRiverRibbon(sampler, path, 1.8, 72), material);
      river.name = `青木域灵河_${index + 1}`;
      river.receiveShadow = true;
      group.add(river);
    });
    return group;
  }

  private createWorldTree(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '东极建木';
    const center = REGIONAL_TERRAIN_CONFIG.east.worldTree;
    const base = sampler.sampleNormalized(center, -1.2);
    group.position.set(base.x, base.y, base.z);

    const barkMaterial = new THREE.MeshStandardMaterial({
      color: 0x665338,
      roughness: 0.92,
      metalness: 0,
    });
    const leafMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x356f3c, roughness: 0.86 }),
      new THREE.MeshStandardMaterial({ color: 0x4f8b4c, roughness: 0.84 }),
      new THREE.MeshStandardMaterial({ color: 0x76a85b, roughness: 0.82 }),
    ];

    const trunkSegments = 9;
    for (let index = 0; index < trunkSegments; index += 1) {
      const t = index / trunkSegments;
      const radiusBottom = lerp(4.8, 1.65, t);
      const radiusTop = lerp(4.35, 1.3, t);
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, 6.2, 48, 5),
        barkMaterial,
      );
      segment.position.set(
        Math.sin(index * 1.3) * 0.65,
        3.1 + index * 5.7,
        Math.cos(index * 1.07) * 0.55,
      );
      segment.rotation.z = Math.sin(index * 0.82) * 0.045;
      group.add(segment);
    }

    const crownY = 47;
    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2 + this.random() * 0.28;
      const branchStart = new THREE.Vector3(0, lerp(25, 43, this.random()), 0);
      const length = lerp(12, 25, this.random());
      const branchEnd = new THREE.Vector3(
        Math.cos(angle) * length,
        branchStart.y + lerp(4, 13, this.random()),
        Math.sin(angle) * length,
      );
      group.add(this.cylinderBetween(branchStart, branchEnd, lerp(0.52, 1.15, this.random()), barkMaterial));

      const foliage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(lerp(6.2, 10.5, this.random()), 3),
        leafMaterials[index % leafMaterials.length],
      );
      foliage.position.copy(branchEnd);
      foliage.scale.y = lerp(0.65, 1.05, this.random());
      foliage.rotation.set(this.random(), this.random() * Math.PI * 2, this.random() * 0.4);
      group.add(foliage);
    }

    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const root = this.cylinderBetween(
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(Math.cos(angle) * 12, 0.2, Math.sin(angle) * 12),
        1.25,
        barkMaterial,
      );
      group.add(root);
    }

    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(10.8, 3), leafMaterials[1]);
    crown.position.set(0, crownY + 8, 0);
    group.add(crown);
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return group;
  }

  private createBuddhaStupaForest(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '西漠万佛塔林';
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a25b, roughness: 0.82, metalness: 0.04 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xe2b95f, roughness: 0.48, metalness: 0.24 });
    const center = REGIONAL_TERRAIN_CONFIG.west.basinCenter;

    for (let index = 0; index < 28; index += 1) {
      const angle = index * 2.399963 + this.random() * 0.18;
      const radius = lerp(0.045, 0.17, Math.sqrt((index + 1) / 28));
      const point = {
        x: center.x + Math.cos(angle) * radius,
        z: center.z + Math.sin(angle) * radius * 1.25,
      };
      const sampled = sampler.sampleNormalized(point, 0.04);
      const stupa = new THREE.Group();
      const scale = lerp(0.65, 1.15, this.random());
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, 0.48, 32), stoneMaterial);
      base.position.y = 0.24;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
        stoneMaterial,
      );
      dome.position.y = 0.52;
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.22, 2.4, 18), goldMaterial);
      spire.position.y = 2.15;
      stupa.add(base, dome, spire);
      stupa.position.set(sampled.x, sampled.y, sampled.z);
      stupa.scale.setScalar(scale);
      stupa.rotation.y = this.random() * Math.PI * 2;
      group.add(stupa);
    }
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return group;
  }

  private createConformingEllipse(
    sampler: TerrainSampler,
    center: NormalizedPoint,
    radiusX: number,
    radiusZ: number,
    innerRadius: number,
    rings: number,
    segments: number,
    lift: number,
  ): THREE.BufferGeometry {
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const rowSize = segments + 1;
    for (let ring = 0; ring <= rings; ring += 1) {
      const ringT = ring / rings;
      const radius = lerp(innerRadius, 1, ringT);
      for (let segment = 0; segment <= segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        const point = {
          x: center.x + Math.cos(angle) * radiusX * radius,
          z: center.z + Math.sin(angle) * radiusZ * radius,
        };
        const sampled = sampler.sampleNormalized(point, lift);
        vertices.push(sampled.x, sampled.y, sampled.z);
        const edgeFade = 1 - Math.pow(ringT, 3.2);
        colors.push(0.62 + edgeFade * 0.28, 0.13 + edgeFade * 0.08, 0.07 + edgeFade * 0.03);
      }
    }
    for (let ring = 0; ring < rings; ring += 1) {
      for (let segment = 0; segment < segments; segment += 1) {
        const a = ring * rowSize + segment;
        const b = a + 1;
        const c = a + rowSize;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createRiverRibbon(
    sampler: TerrainSampler,
    path: NormalizedPoint[],
    width: number,
    steps: number,
  ): THREE.BufferGeometry {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const scaled = (step / steps) * (path.length - 1);
      const index = Math.min(path.length - 2, Math.floor(scaled));
      const t = scaled - index;
      const point = {
        x: lerp(path[index].x, path[index + 1].x, t),
        z: lerp(path[index].z, path[index + 1].z, t),
      };
      const previous = path[Math.max(0, index)];
      const next = path[Math.min(path.length - 1, index + 1)];
      const tangentX = (next.x - previous.x) * TERRAIN_CONFIG.worldWidth;
      const tangentZ = (next.z - previous.z) * TERRAIN_CONFIG.worldDepth;
      const length = Math.hypot(tangentX, tangentZ) || 1;
      const normalX = -tangentZ / length;
      const normalZ = tangentX / length;
      const center = sampler.normalizedToWorld(point);
      for (const side of [-1, 1]) {
        const worldX = center.x + normalX * width * side;
        const worldZ = center.z + normalZ * width * side;
        vertices.push(worldX, sampler.sampleHeight(worldX, worldZ) + 0.9, worldZ);
        uvs.push(side < 0 ? 0 : 1, step / steps);
      }
    }
    for (let step = 0; step < steps; step += 1) {
      const a = step * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private cylinderBetween(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.72, radius, direction.length(), 28, 4),
      material,
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }
}
