import * as THREE from 'three';
import { VEGETATION_CONFIG, VEGETATION_MEMORY_ESTIMATE } from '../data/biomeConfig';
import { TerrainSampler } from '../terrain/TerrainSampler';
import { TreePrototypeId, VegetationPlacement, VegetationStats } from '../types/vegetation';
import { RockPrototypeFactory } from './RockPrototypeFactory';
import { ShrubPrototypeFactory } from './ShrubPrototypeFactory';
import { VegetationPlacementSystem } from './VegetationPlacement';

const UP = new THREE.Vector3(0, 1, 0);

type TreePartDefinition = {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  transform: (placement: VegetationPlacement, index: number, matrix: THREE.Matrix4) => void;
  color: number;
  castShadow?: boolean;
};

function makeMaterial(color: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.84,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
    ...options,
  });
}

function tint(base: number, jitter: number, color: THREE.Color): THREE.Color {
  color.setHex(base);
  color.offsetHSL(0, 0.02 * jitter, jitter * 0.24);
  return color;
}

export class VegetationSystem {
  private readonly placementSystem = new VegetationPlacementSystem();
  private readonly shrubFactory = new ShrubPrototypeFactory();
  private readonly rockFactory = new RockPrototypeFactory();

  build(sampler: TerrainSampler): THREE.Group {
    const result = this.placementSystem.generate(sampler);
    const root = new THREE.Group();
    root.name = '风格化树木实例层';

    const treeLayer = new THREE.Group();
    treeLayer.name = '植被远景树冠主体层';
    treeLayer.userData.lodRole = 'main';
    this.buildTreeLayer(result.trees, treeLayer);

    const shrubLayer = this.shrubFactory.build(result.shrubs);
    const rockLayer = this.rockFactory.build(result.rocks);

    root.add(treeLayer, shrubLayer, rockLayer);
    const stats = this.finalizeStats(root, result.stats);
    root.userData.vegetationStats = stats;
    console.info('[玄天界植被统计]', stats);
    return root;
  }

  private buildTreeLayer(placements: Map<TreePrototypeId, VegetationPlacement[]>, group: THREE.Group): void {
    this.buildConifer('conifer_a', placements.get('conifer_a') ?? [], group, 4, 0x2f6d46, 0x5b3f28);
    this.buildConifer('conifer_b', placements.get('conifer_b') ?? [], group, 5, 0x255d3e, 0x533724);
    this.buildConifer('conifer_c', placements.get('conifer_c') ?? [], group, 3, 0x3d7a4e, 0x68442b);
    this.buildBroadleaf('broadleaf_a', placements.get('broadleaf_a') ?? [], group, 3, 0x3b8b45, 0x684329);
    this.buildBroadleaf('broadleaf_b', placements.get('broadleaf_b') ?? [], group, 4, 0x2e7a3c, 0x5d3b25);
    this.buildBroadleaf('broadleaf_c', placements.get('broadleaf_c') ?? [], group, 2, 0x5b9145, 0x70472d);
    this.buildBroadleaf('broadleaf_d', placements.get('broadleaf_d') ?? [], group, 4, 0x2c6f38, 0x583a26);
    this.buildDeadTree('dead_tree_a', placements.get('dead_tree_a') ?? [], group, 0x6f624e);
    this.buildDeadTree('dead_tree_b', placements.get('dead_tree_b') ?? [], group, 0x51483d, true);
    this.buildDeadTree('volcanic_dead_tree', placements.get('volcanic_dead_tree') ?? [], group, 0x211d1a, true);
    this.buildSpiritTree(placements.get('spirit_tree') ?? [], group);
  }

  private buildConifer(id: TreePrototypeId, placements: VegetationPlacement[], group: THREE.Group, layers: number, leafColor: number, trunkColor: number): void {
    const parts: TreePartDefinition[] = [
      {
        name: `${id}_树干`,
        geometry: new THREE.CylinderGeometry(0.18, 0.28, 1, VEGETATION_CONFIG.trunkSegmentCount),
        material: makeMaterial(trunkColor, { roughness: 0.9 }),
        color: trunkColor,
        transform: (placement, _index, matrix) => {
          this.compose(matrix, placement, 0, placement.height * 0.31, 0, placement.radius * 0.24, placement.height * 0.62, placement.radius * 0.24);
        },
      },
    ];

    for (let layer = 0; layer < layers; layer += 1) {
      const t = layers <= 1 ? 0 : layer / (layers - 1);
      parts.push({
        name: `${id}_错位针叶冠${layer + 1}`,
        geometry: new THREE.CylinderGeometry(0.18, 1, 1, VEGETATION_CONFIG.canopySegmentCount),
        material: makeMaterial(leafColor, { roughness: 0.82 }),
        color: layer % 2 === 0 ? leafColor : leafColor + 0x071105,
        castShadow: placements.length < VEGETATION_CONFIG.castShadowMaxInstances,
        transform: (placement, index, matrix) => {
          const angle = placement.rotation + layer * 1.7 + (index % 5) * 0.08;
          const width = placement.radius * (1.34 - t * 0.32);
          this.compose(
            matrix,
            placement,
            Math.cos(angle) * placement.radius * 0.09 * (layer % 2 === 0 ? 1 : -1),
            placement.height * (0.38 + t * 0.14),
            Math.sin(angle) * placement.radius * 0.09,
            width,
            placement.height * (0.26 - t * 0.035),
            width,
          );
        },
      });
    }

    this.addParts(group, placements, parts);
  }

  private buildBroadleaf(id: TreePrototypeId, placements: VegetationPlacement[], group: THREE.Group, crownCount: number, leafColor: number, trunkColor: number): void {
    const parts: TreePartDefinition[] = [
      {
        name: `${id}_树干`,
        geometry: new THREE.CylinderGeometry(0.2, 0.32, 1, VEGETATION_CONFIG.trunkSegmentCount),
        material: makeMaterial(trunkColor, { roughness: 0.9 }),
        color: trunkColor,
        transform: (placement, _index, matrix) => {
          this.compose(matrix, placement, 0, placement.height * 0.28, 0, placement.radius * 0.22, placement.height * 0.56, placement.radius * 0.22);
        },
      },
    ];

    for (let crown = 0; crown < crownCount; crown += 1) {
      parts.push({
        name: `${id}_阔叶冠团${crown + 1}`,
        geometry: new THREE.IcosahedronGeometry(1, 1),
        material: makeMaterial(leafColor, { roughness: 0.8 }),
        color: crown % 2 === 0 ? leafColor : leafColor + 0x0a1004,
        castShadow: placements.length < VEGETATION_CONFIG.castShadowMaxInstances,
        transform: (placement, index, matrix) => {
          const angle = placement.rotation + crown * ((Math.PI * 2) / Math.max(1, crownCount)) + (index % 7) * 0.05;
          const offset = crown === 0 ? 0 : placement.radius * (0.3 + crown * 0.08);
          this.compose(
            matrix,
            placement,
            Math.cos(angle) * offset,
            placement.height * (0.68 + (crown % 2) * 0.06),
            Math.sin(angle) * offset,
            placement.radius * (0.85 + (crown % 3) * 0.12),
            placement.height * (0.25 + (crown % 2) * 0.035),
            placement.radius * (0.75 + (crown % 2) * 0.1),
          );
        },
      });
    }

    this.addParts(group, placements, parts);
  }

  private buildDeadTree(id: TreePrototypeId, placements: VegetationPlacement[], group: THREE.Group, trunkColor: number, crooked = false): void {
    const material = makeMaterial(trunkColor, { roughness: 0.96 });
    const parts: TreePartDefinition[] = [
      {
        name: `${id}_枯干`,
        geometry: new THREE.CylinderGeometry(0.08, 0.2, 1, 6),
        material,
        color: trunkColor,
        transform: (placement, _index, matrix) => {
          this.compose(matrix, placement, 0, placement.height * 0.42, 0, placement.radius * 0.18, placement.height * 0.84, placement.radius * 0.18);
        },
      },
      {
        name: `${id}_断枝左`,
        geometry: new THREE.CylinderGeometry(0.035, 0.07, 1, 5),
        material,
        color: trunkColor,
        transform: (placement, _index, matrix) => {
          this.compose(matrix, placement, placement.radius * 0.18, placement.height * 0.63, 0, placement.radius * 0.08, placement.height * 0.34, placement.radius * 0.08, 0.72);
        },
      },
      {
        name: `${id}_断枝右`,
        geometry: new THREE.CylinderGeometry(0.03, 0.06, 1, 5),
        material,
        color: trunkColor,
        transform: (placement, _index, matrix) => {
          this.compose(matrix, placement, -placement.radius * 0.16, placement.height * 0.5, 0, placement.radius * 0.07, placement.height * 0.26, placement.radius * 0.07, crooked ? -0.82 : -0.62);
        },
      },
    ];
    this.addParts(group, placements, parts);
  }

  private buildSpiritTree(placements: VegetationPlacement[], group: THREE.Group): void {
    const trunkColor = 0x7f6b45;
    const leafColor = 0x5ea968;
    const glowColor = 0x9bf2d6;
    const parts: TreePartDefinition[] = [
      {
        name: 'spirit_tree_古树干',
        geometry: new THREE.CylinderGeometry(0.25, 0.55, 1, 12),
        material: makeMaterial(trunkColor, { roughness: 0.78 }),
        color: trunkColor,
        castShadow: true,
        transform: (placement, _index, matrix) => {
          this.compose(matrix, placement, 0, placement.height * 0.36, 0, placement.radius * 0.34, placement.height * 0.72, placement.radius * 0.34);
        },
      },
    ];

    for (let crown = 0; crown < 6; crown += 1) {
      parts.push({
        name: `spirit_tree_灵木冠团${crown + 1}`,
        geometry: new THREE.IcosahedronGeometry(1, 1),
        material: makeMaterial(leafColor, { roughness: 0.72, emissive: new THREE.Color(0x123a26), emissiveIntensity: 0.18 }),
        color: crown % 3 === 0 ? glowColor : leafColor,
        castShadow: true,
        transform: (placement, _index, matrix) => {
          const angle = placement.rotation + crown * 1.08;
          const offset = crown === 0 ? 0 : placement.radius * (0.34 + (crown % 3) * 0.1);
          this.compose(
            matrix,
            placement,
            Math.cos(angle) * offset,
            placement.height * (0.62 + (crown % 3) * 0.08),
            Math.sin(angle) * offset,
            placement.radius * (0.9 + (crown % 2) * 0.16),
            placement.height * 0.22,
            placement.radius * 0.8,
          );
        },
      });
    }

    this.addParts(group, placements, parts);
  }

  private addParts(group: THREE.Group, placements: VegetationPlacement[], parts: TreePartDefinition[]): void {
    parts.forEach((part) => {
      if (placements.length === 0) {
        part.geometry.dispose();
        part.material.dispose();
        return;
      }
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
      mesh.name = part.name;
      mesh.castShadow = Boolean(part.castShadow);
      mesh.receiveShadow = true;
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      placements.forEach((placement, index) => {
        part.transform(placement, index, matrix);
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, tint(part.color, placement.colorJitter, color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    });
  }

  private compose(
    matrix: THREE.Matrix4,
    placement: VegetationPlacement,
    offsetX: number,
    offsetY: number,
    offsetZ: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    branchTilt = 0,
  ): void {
    const offset = new THREE.Vector3(offsetX, offsetY, offsetZ).applyAxisAngle(UP, placement.rotation);
    const position = new THREE.Vector3(placement.x + offset.x, placement.y + offset.y, placement.z + offset.z);
    const baseRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(placement.tiltX, placement.rotation, placement.tiltZ, 'YXZ'));
    if (branchTilt !== 0) {
      baseRotation.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, branchTilt)));
    }
    const scale = new THREE.Vector3(scaleX, scaleY, scaleZ);
    matrix.compose(position, baseRotation, scale);
  }

  private finalizeStats(root: THREE.Group, stats: VegetationStats): VegetationStats {
    let drawCalls = 0;
    let instances = 0;
    root.traverse((object) => {
      const mesh = object as THREE.InstancedMesh;
      if (mesh.isInstancedMesh) {
        drawCalls += 1;
        instances += mesh.count;
      }
    });
    const memoryBytes =
      instances * (VEGETATION_MEMORY_ESTIMATE.matrixBytesPerInstance + VEGETATION_MEMORY_ESTIMATE.colorBytesPerInstance) +
      drawCalls * VEGETATION_MEMORY_ESTIMATE.approximateGeometryBytesPerDrawCall;
    return {
      ...stats,
      drawCalls,
      estimatedGpuMemoryMb: Number((memoryBytes / (1024 * 1024)).toFixed(2)),
      initMs: Number(stats.initMs.toFixed(1)),
    };
  }
}
