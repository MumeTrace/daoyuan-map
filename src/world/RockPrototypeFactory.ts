import * as THREE from 'three';
import { VEGETATION_CONFIG } from '../data/biomeConfig';
import { RockPrototypeId, VegetationPlacement } from '../types/vegetation';

function makeMaterial(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    flatShading: true,
    vertexColors: true,
  });
}

function tint(base: number, jitter: number, color: THREE.Color): THREE.Color {
  color.setHex(base);
  color.offsetHSL(0, 0.015 * jitter, jitter * 0.18);
  return color;
}

function irregularRockGeometry(seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const wobble = 0.82 + ((Math.sin(x * 12.989 + y * 78.233 + z * 37.719 + seed) + 1) * 0.5) * 0.32;
    position.setXYZ(index, x * wobble, y * (0.75 + wobble * 0.25), z * wobble);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export class RockPrototypeFactory {
  build(placements: Map<RockPrototypeId, VegetationPlacement[]>): THREE.Group {
    const group = new THREE.Group();
    group.name = '植被中景岩石与冰晶层';
    group.userData.lodRole = 'mid';
    const definitions: Array<{ id: RockPrototypeId; color: number; seed: number; crystal?: boolean }> = [
      { id: 'rock_granite_a', color: 0x7b8077, seed: 1 },
      { id: 'rock_granite_b', color: 0x626b6f, seed: 2 },
      { id: 'rock_slate', color: 0x879097, seed: 3 },
      { id: 'rock_sandstone', color: 0xb38b55, seed: 4 },
      { id: 'rock_volcanic_a', color: 0x2b2724, seed: 5 },
      { id: 'rock_volcanic_b', color: 0x42302a, seed: 6 },
      { id: 'ice_crystal_a', color: 0xaee6f2, seed: 7, crystal: true },
      { id: 'ice_crystal_b', color: 0xd6f8ff, seed: 8, crystal: true },
    ];

    definitions.forEach((definition) => {
      const items = placements.get(definition.id) ?? [];
      const geometry = definition.crystal ? new THREE.OctahedronGeometry(1, 1) : irregularRockGeometry(definition.seed);
      const material = makeMaterial(definition.color, definition.crystal ? 0.48 : 0.92);
      this.addInstancedRock(group, definition.id, geometry, material, items, definition.color, Boolean(definition.crystal));
    });

    return group;
  }

  private addInstancedRock(
    group: THREE.Group,
    id: RockPrototypeId,
    geometry: THREE.BufferGeometry,
    material: THREE.MeshStandardMaterial,
    placements: VegetationPlacement[],
    baseColor: number,
    isCrystal: boolean,
  ): void {
    if (placements.length === 0) {
      geometry.dispose();
      material.dispose();
      return;
    }
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    mesh.name = id;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    placements.forEach((placement, index) => {
      const embed = isCrystal ? 0.08 : VEGETATION_CONFIG.rockEmbed;
      position.set(placement.x, placement.y + placement.height * 0.5 - embed, placement.z);
      rotation.setFromEuler(new THREE.Euler(placement.tiltX, placement.rotation, placement.tiltZ, 'YXZ'));
      scale.set(
        placement.radius * (isCrystal ? 0.45 : 1.15),
        placement.height,
        placement.radius * (isCrystal ? 0.45 : 0.72),
      );
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, tint(baseColor, placement.colorJitter, color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }
}
