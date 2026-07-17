import * as THREE from 'three';
import { ShrubPrototypeId, VegetationPlacement } from '../types/vegetation';

const UP = new THREE.Vector3(0, 1, 0);

function makeMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.86,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });
}

function tint(base: number, jitter: number, color: THREE.Color): THREE.Color {
  color.setHex(base);
  color.offsetHSL(0, 0.02 * jitter, jitter * 0.22);
  return color;
}

export class ShrubPrototypeFactory {
  build(placements: Map<ShrubPrototypeId, VegetationPlacement[]>): THREE.Group {
    const group = new THREE.Group();
    group.name = '植被近景细节层';
    group.userData.lodRole = 'detail';

    this.buildDesertShrub(placements.get('desert_shrub') ?? [], group);
    this.buildForestShrub(placements.get('forest_shrub') ?? [], group);
    this.buildFloweringShrub(placements.get('flowering_shrub') ?? [], group);
    return group;
  }

  private buildDesertShrub(placements: VegetationPlacement[], group: THREE.Group): void {
    const twigMaterial = makeMaterial(0x725532);
    const dryMaterial = makeMaterial(0x9f915f);
    this.addPart(group, '沙漠灌木枯枝', new THREE.CylinderGeometry(0.06, 0.1, 1, 5), twigMaterial, placements, (placement, matrix) => {
      this.compose(matrix, placement, 0, placement.height * 0.42, 0, placement.radius * 0.13, placement.height * 0.82, placement.radius * 0.13);
    }, 0x725532);
    for (let layer = 0; layer < 2; layer += 1) {
      this.addPart(group, `沙漠灌木干叶${layer + 1}`, new THREE.IcosahedronGeometry(1, 0), dryMaterial, placements, (placement, matrix) => {
        const angle = placement.rotation + layer * 2.25;
        this.compose(
          matrix,
          placement,
          Math.cos(angle) * placement.radius * 0.28,
          placement.height * (0.48 + layer * 0.1),
          Math.sin(angle) * placement.radius * 0.28,
          placement.radius * (0.55 - layer * 0.08),
          placement.height * 0.18,
          placement.radius * 0.42,
        );
      }, 0x9f915f);
    }
  }

  private buildForestShrub(placements: VegetationPlacement[], group: THREE.Group): void {
    const material = makeMaterial(0x2e7a3c);
    for (let layer = 0; layer < 3; layer += 1) {
      this.addPart(group, `林下灌木冠团${layer + 1}`, new THREE.IcosahedronGeometry(1, 0), material, placements, (placement, matrix) => {
        const angle = placement.rotation + layer * 2.1;
        this.compose(
          matrix,
          placement,
          Math.cos(angle) * placement.radius * 0.22,
          placement.height * (0.34 + layer * 0.1),
          Math.sin(angle) * placement.radius * 0.22,
          placement.radius * (0.52 + layer * 0.05),
          placement.height * 0.2,
          placement.radius * (0.44 + layer * 0.03),
        );
      }, layer === 1 ? 0x3b8b44 : 0x2e7a3c);
    }
  }

  private buildFloweringShrub(placements: VegetationPlacement[], group: THREE.Group): void {
    const leafMaterial = makeMaterial(0x367f45);
    const flowerMaterial = makeMaterial(0xe2a7cb);
    for (let layer = 0; layer < 2; layer += 1) {
      this.addPart(group, `灵花灌木叶团${layer + 1}`, new THREE.IcosahedronGeometry(1, 0), leafMaterial, placements, (placement, matrix) => {
        const angle = placement.rotation + layer * Math.PI;
        this.compose(
          matrix,
          placement,
          Math.cos(angle) * placement.radius * 0.18,
          placement.height * (0.38 + layer * 0.12),
          Math.sin(angle) * placement.radius * 0.18,
          placement.radius * 0.56,
          placement.height * 0.23,
          placement.radius * 0.48,
        );
      }, 0x367f45);
    }
    this.addPart(group, '灵花灌木花簇', new THREE.IcosahedronGeometry(1, 0), flowerMaterial, placements, (placement, matrix) => {
      this.compose(matrix, placement, 0, placement.height * 0.68, 0, placement.radius * 0.18, placement.height * 0.08, placement.radius * 0.18);
    }, 0xe2a7cb);
  }

  private addPart(
    group: THREE.Group,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.MeshStandardMaterial,
    placements: VegetationPlacement[],
    transform: (placement: VegetationPlacement, matrix: THREE.Matrix4) => void,
    baseColor: number,
  ): void {
    if (placements.length === 0) {
      geometry.dispose();
      material.dispose();
      return;
    }
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    placements.forEach((placement, index) => {
      transform(placement, matrix);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, tint(baseColor, placement.colorJitter, color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
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
  ): void {
    const offset = new THREE.Vector3(offsetX, offsetY, offsetZ).applyAxisAngle(UP, placement.rotation);
    const position = new THREE.Vector3(placement.x + offset.x, placement.y + offset.y, placement.z + offset.z);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(placement.tiltX, placement.rotation, placement.tiltZ, 'YXZ'));
    const scale = new THREE.Vector3(scaleX, scaleY, scaleZ);
    matrix.compose(position, rotation, scale);
  }
}
