import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FEATURE_CONFIG, WORLD_SCALE_CONFIG } from '../data/mapConfig';
import { SECTS, SectDefinition, SectKind } from '../data/regions';
import { TerrainSampler } from '../terrain/TerrainSampler';

type SectPalette = {
  stone: number;
  roof: number;
  accent: number;
  glow: number;
  dark: number;
};

const PALETTES: Record<SectKind, SectPalette> = {
  imperial: { stone: 0xc8b78d, roof: 0x8c2f24, accent: 0xf0c66c, glow: 0xffe6a3, dark: 0x4c3326 },
  star: { stone: 0x8592aa, roof: 0x223f67, accent: 0xd5c084, glow: 0x9ee7ff, dark: 0x192235 },
  dao: { stone: 0x9fb39c, roof: 0x355a42, accent: 0xd5c084, glow: 0xc8ffd5, dark: 0x24382a },
  sword: { stone: 0x9ba8b5, roof: 0x536370, accent: 0xdfe8ef, glow: 0x9bd7ff, dark: 0x26313a },
  law: { stone: 0xb0a27d, roof: 0x594276, accent: 0xf2d88c, glow: 0xd7b7ff, dark: 0x2d2238 },
  ice: { stone: 0xd8edf5, roof: 0x8fd8ff, accent: 0xffffff, glow: 0xbff7ff, dark: 0x31566a },
  buddha: { stone: 0xd1aa63, roof: 0x9f6328, accent: 0xffde88, glow: 0xffcf62, dark: 0x553b20 },
  sun: { stone: 0xa66a38, roof: 0x972b1f, accent: 0xffd05a, glow: 0xff761f, dark: 0x421c16 },
  demon: { stone: 0x5b5960, roof: 0x2b2131, accent: 0x9d77bb, glow: 0xb04cff, dark: 0x16121a },
  blood: { stone: 0x553337, roof: 0x6e1515, accent: 0xd7644d, glow: 0xff2b2b, dark: 0x241112 },
  soul: { stone: 0x4c4a5f, roof: 0x26304e, accent: 0x8d9adf, glow: 0x78a6ff, dark: 0x111827 },
  beast: { stone: 0x5d7e52, roof: 0x315c3b, accent: 0xb9e07c, glow: 0x8cff9b, dark: 0x1e3323 },
  neutral: { stone: 0xa6a38f, roof: 0x51606c, accent: 0xe7d391, glow: 0xafe7ff, dark: 0x2c3540 },
  alchemy: { stone: 0x9e8061, roof: 0x4f6e51, accent: 0xe9c66f, glow: 0x8dffbe, dark: 0x2a3728 },
  array: { stone: 0x8e93a2, roof: 0x3c466f, accent: 0xc4b6ff, glow: 0xb6a8ff, dark: 0x24283f },
};

function polar(radius: number, angle: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

export class SectModelBuilder {
  /** 创建图中所有宗门/势力的高细分标志建筑群。 */
  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '标志建筑层';

    SECTS.forEach((sect) => {
      const modelLift = sect.kind === 'star' ? 78 : 2.1;
      const position = sampler.sampleNormalized(sect.position, modelLift);
      const sectGroup = this.createSect(sect);
      sectGroup.position.set(position.x, position.y, position.z);
      sectGroup.rotation.y = (sect.position.x * 17 + sect.position.z * 29) % (Math.PI * 2);
      sectGroup.userData.sectId = sect.id;
      sectGroup.userData.fallbackType = 'sect';
      sectGroup.userData.landmarkModelId = sect.landmarkModelId ?? null;
      group.add(sectGroup);
    });

    return group;
  }

  private createSect(sect: SectDefinition): THREE.Group {
    const palette = PALETTES[sect.kind];
    const group = new THREE.Group();
    group.name = `${sect.name}精细宗门模型`;

    const scale = (0.62 + sect.importance * 0.52) * FEATURE_CONFIG.sectModels.detailScale;
    group.scale.setScalar(scale);
    group.add(this.createFoundation(palette, 4.8 + sect.importance * 2.1));

    if (sect.kind === 'imperial') {
      group.add(this.createPalaceCity(palette));
    } else if (sect.kind === 'star') {
      group.add(this.createStarSect(palette));
    } else if (sect.kind === 'sword') {
      group.add(this.createSwordSect(palette));
    } else if (sect.kind === 'buddha') {
      group.add(this.createBuddhaTemple(palette));
    } else if (sect.kind === 'sun') {
      group.add(this.createSunPalace(palette));
    } else if (sect.kind === 'ice') {
      group.add(this.createIcePalace(palette));
    } else if (sect.kind === 'beast') {
      group.add(this.createBeastSanctum(palette));
    } else if (sect.kind === 'blood' || sect.kind === 'demon' || sect.kind === 'soul') {
      group.add(this.createDemonSect(palette, sect.kind));
    } else if (sect.kind === 'array' || sect.kind === 'law') {
      group.add(this.createArraySect(palette));
    } else if (sect.kind === 'alchemy') {
      group.add(this.createAlchemySect(palette));
    } else {
      group.add(this.createDaoCourtyard(palette));
    }

    group.add(this.createBeacon(palette));
    group.add(this.createLanternRing(palette, 5.9 + sect.importance, 10));
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return group;
  }

  private createFoundation(palette: SectPalette, radius: number): THREE.Group {
    const group = new THREE.Group();
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.08, radius * 1.16, 0.55, FEATURE_CONFIG.sectModels.haloSegments, 2),
      this.material(palette.dark, 0.78, 0.06),
    );
    lower.position.y = 0.18;
    const middle = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.96, radius * 1.04, 0.72, FEATURE_CONFIG.sectModels.haloSegments, 2),
      this.material(palette.stone, 0.82, 0.04),
    );
    middle.position.y = 0.8;
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius * 0.88, 0.38, FEATURE_CONFIG.sectModels.haloSegments, 1),
      this.material(palette.accent, 0.48, 0.22),
    );
    upper.position.y = 1.35;

    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.08, 0.08, 16, FEATURE_CONFIG.sectModels.haloSegments), this.material(palette.accent, 0.44, 0.2));
    outerRim.rotation.x = Math.PI / 2;
    outerRim.position.y = 0.52;
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, 0.055, 12, FEATURE_CONFIG.sectModels.haloSegments), this.emissiveMaterial(palette.glow, 0.2));
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.y = 1.58;

    for (let index = 0; index < 18; index += 1) {
      const p = polar(radius * 1.1, (index / 18) * Math.PI * 2);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.7, 10), this.material(palette.accent, 0.5, 0.14));
      rail.position.set(p.x, 1.32, p.z);
      group.add(rail);
    }

    group.add(lower, middle, upper, outerRim, innerRim);
    return group;
  }

  private createPalaceCity(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 5, 1.8, 10.5));
    [-4.2, 4.2].forEach((x) => {
      const wing = this.box(3.2, 2.2, 2.5, palette.stone);
      wing.position.set(x, 1.9, 0);
      group.add(wing, this.roof(x, 3.35, 0, 2.4, palette));
    });
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
      const p = polar(4.7, angle);
      const gate = this.box(1.4, 2.4, 0.5, palette.accent);
      gate.position.set(p.x, 2.1, p.z);
      gate.rotation.y = -angle;
      group.add(gate);
    });
    this.addColumnRing(group, palette, 5.2, 16, 2.6);
    return group;
  }

  private createStarSect(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 4.8, 0.62, FEATURE_CONFIG.sectModels.haloSegments),
      this.material(palette.stone, 0.78, 0.05),
    );
    platform.position.y = 0.95;
    const starRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.7, 0.06, 12, FEATURE_CONFIG.sectModels.haloSegments),
      this.emissiveMaterial(palette.glow, 0.75),
    );
    starRing.rotation.x = Math.PI / 2;
    starRing.position.y = 1.55;
    const tiltedRingA = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.045, 10, FEATURE_CONFIG.sectModels.haloSegments), this.emissiveMaterial(palette.glow, 0.5));
    tiltedRingA.rotation.set(Math.PI / 2.8, 0.2, Math.PI / 8);
    tiltedRingA.position.y = 5.6;
    const tiltedRingB = tiltedRingA.clone();
    tiltedRingB.rotation.set(Math.PI / 2.4, Math.PI / 2.1, -Math.PI / 7);
    tiltedRingB.material = this.emissiveMaterial(palette.accent, 0.42);
    group.add(platform, starRing, tiltedRingA, tiltedRingB, this.createPagoda(palette, 4, 1.16, 8.0));
    for (let index = 0; index < 8; index += 1) {
      const p = polar(3.7, (index / 8) * Math.PI * 2);
      const obelisk = this.createObelisk(palette, 0.32, 4.2);
      obelisk.position.set(p.x, 1.35, p.z);
      group.add(obelisk);
    }
    return group;
  }

  private createSwordSect(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 3, 1.25, 7.4));
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const p = polar(4.6, angle);
      const sword = this.createSword(palette, 5.5 + (index % 3) * 0.8);
      sword.position.set(p.x, 1.1, p.z);
      sword.rotation.y = -angle;
      group.add(sword);
    }
    return group;
  }

  private createBuddhaTemple(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 6, 1.55, 11.2));
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, FEATURE_CONFIG.sectModels.domeSegments, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      this.material(palette.accent, 0.42, 0.18),
    );
    dome.position.y = 8.6;
    group.add(dome);
    this.addColumnRing(group, palette, 4.8, 12, 2.2);
    return group;
  }

  private createSunPalace(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 4, 1.45, 8.6));
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.2, 48, 24), this.emissiveMaterial(palette.glow, 1.2));
    sun.position.y = 9.2;
    group.add(sun);
    for (let index = 0; index < 12; index += 1) {
      const ray = this.box(0.12, 2.1, 0.12, palette.accent);
      ray.position.copy(polar(3.8, (index / 12) * Math.PI * 2));
      ray.position.y = 4.4;
      ray.rotation.z = Math.PI / 5;
      group.add(ray);
    }
    return group;
  }

  private createIcePalace(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 4, 1.35, 8.2));
    for (let index = 0; index < 9; index += 1) {
      const p = polar(4.1, (index / 9) * Math.PI * 2);
      const crystal = this.createObelisk(palette, 0.35 + (index % 2) * 0.12, 4.6 + (index % 3) * 0.9);
      crystal.position.set(p.x, 1.1, p.z);
      group.add(crystal);
    }
    return group;
  }

  private createBeastSanctum(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 3, 1.15, 6.8));
    const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 3), this.material(palette.accent, 0.72, 0.02));
    tree.position.y = 6.4;
    group.add(tree);
    this.addColumnRing(group, palette, 4.4, 9, 2.1);
    return group;
  }

  private createDemonSect(palette: SectPalette, kind: SectKind): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 4, 1.3, 8.1));
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.1, 12, FEATURE_CONFIG.sectModels.haloSegments),
      this.emissiveMaterial(palette.glow, kind === 'blood' ? 1.0 : 0.65),
    );
    ring.position.y = 4.1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    for (let index = 0; index < 6; index += 1) {
      const p = polar(4.3, (index / 6) * Math.PI * 2);
      const spike = this.createObelisk(palette, 0.24, 4.8);
      spike.position.set(p.x, 1, p.z);
      group.add(spike);
    }
    return group;
  }

  private createArraySect(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 3, 1.2, 7.3));
    [2.8, 4.1, 5.4].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.055, 10, FEATURE_CONFIG.sectModels.haloSegments),
        this.emissiveMaterial(index === 1 ? palette.accent : palette.glow, 0.42),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.55 + index * 0.06;
      group.add(ring);
    });
    this.addColumnRing(group, palette, 4.7, 8, 2.8);
    return group;
  }

  private createAlchemySect(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 3, 1.25, 7.2));
    const cauldron = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 22), this.material(palette.dark, 0.58, 0.16));
    cauldron.scale.y = 0.72;
    cauldron.position.set(0, 2.3, 3.4);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 16), this.emissiveMaterial(palette.glow, 0.75));
    glow.position.set(0, 3.0, 3.4);
    group.add(cauldron, glow);
    return group;
  }

  private createDaoCourtyard(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createPagoda(palette, 4, 1.25, 8.1));
    [-3.4, 3.4].forEach((x) => {
      const hall = this.box(2.2, 1.7, 2.0, palette.stone);
      hall.position.set(x, 1.55, 1.2);
      group.add(hall, this.roof(x, 2.55, 1.2, 1.8, palette));
    });
    return group;
  }

  private createPagoda(palette: SectPalette, levels: number, radius: number, height: number): THREE.Group {
    const group = new THREE.Group();
    for (let level = 0; level < levels; level += 1) {
      const t = level / levels;
      const bodyHeight = height / levels * 0.58;
      const levelRadius = radius * (1 - t * 0.36);
      const y = 1.2 + level * (height / levels);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(levelRadius * 0.72, levelRadius * 0.9, bodyHeight, FEATURE_CONFIG.sectModels.towerSegments, 3),
        this.material(palette.stone, 0.76, 0.04),
      );
      body.position.y = y;
      const roof = this.createTierRoof(palette, levelRadius * 1.36, bodyHeight * 0.42);
      roof.position.y = y + bodyHeight * 0.5;
      group.add(body, roof);
    }
    const spire = this.createObelisk(palette, radius * 0.28, height * 0.26);
    spire.position.y = height + 0.7;
    group.add(spire);
    return group;
  }

  private addColumnRing(group: THREE.Group, palette: SectPalette, radius: number, count: number, height: number): void {
    for (let index = 0; index < count; index += 1) {
      const p = polar(radius, (index / count) * Math.PI * 2);
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, height, 16),
        this.material(palette.accent, 0.52, 0.14),
      );
      column.position.set(p.x, 1.2 + height * 0.5, p.z);
      group.add(column);
    }
  }

  private createBeacon(palette: SectPalette): THREE.Group {
    const group = new THREE.Group();
    const height = WORLD_SCALE_CONFIG.sectBuildingHeight.max * 0.55;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.08, height, 16),
      this.emissiveMaterial(palette.glow, 0.42),
    );
    beam.position.set(0, height * 0.5 + 1.3, 0);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12), this.emissiveMaterial(palette.glow, 0.78));
    orb.position.y = height + 1.55;
    group.add(beam, orb);
    return group;
  }

  private createSword(palette: SectPalette, height: number): THREE.Group {
    const group = new THREE.Group();
    const blade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.13, height, 4),
      this.material(palette.accent, 0.38, 0.28),
    );
    blade.position.y = height * 0.5;
    blade.rotation.y = Math.PI / 4;
    const guard = this.box(1.05, 0.1, 0.15, palette.dark);
    guard.position.y = 0.8;
    group.add(blade, guard);
    return group;
  }

  private createObelisk(palette: SectPalette, radius: number, height: number): THREE.Group {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.16, height * 0.72, 8), this.material(palette.stone, 0.72, 0.06));
    base.position.y = height * 0.36;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, radius * 0.82, height * 0.28, 8), this.material(palette.accent, 0.48, 0.16));
    tip.position.y = height * 0.86;
    group.add(base, tip);
    return group;
  }

  private createTierRoof(palette: SectPalette, radius: number, height: number): THREE.Group {
    const group = new THREE.Group();
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.2, radius, height, 12, 2),
      this.material(palette.roof, 0.58, 0.1),
    );
    const eave = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.96, 0.055, 10, 72), this.material(palette.accent, 0.48, 0.18));
    eave.rotation.x = Math.PI / 2;
    eave.position.y = -height * 0.42;
    group.add(roof, eave);
    return group;
  }

  private roof(x: number, y: number, z: number, radius: number, palette: SectPalette): THREE.Group {
    const group = this.createTierRoof(palette, radius, 0.78);
    group.position.set(x, y, z);
    return group;
  }

  private box(width: number, height: number, depth: number, color: number): THREE.Mesh {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 5, 0.08), this.material(color, 0.78, 0.04));
    return mesh;
  }

  private createLanternRing(palette: SectPalette, radius: number, count: number): THREE.Group {
    const group = new THREE.Group();
    for (let index = 0; index < count; index += 1) {
      const p = polar(radius, (index / count) * Math.PI * 2);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), this.emissiveMaterial(palette.glow, 0.7));
      lantern.position.set(p.x, 1.95 + (index % 2) * 0.25, p.z);
      group.add(lantern);
    }
    return group;
  }

  private material(color: number, roughness: number, metalness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
  }

  private emissiveMaterial(color: number, intensity: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.42,
      metalness: 0.12,
      transparent: true,
      opacity: 0.9,
    });
  }
}
