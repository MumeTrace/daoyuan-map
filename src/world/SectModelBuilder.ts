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
      const modelLift = sect.kind === 'star' ? 78 : 0.08;
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
    const centralHall = this.createTempleHall(palette, 6.8, 4.8, 5.2, 1.6);
    centralHall.position.set(0, 1.45, -0.8);
    group.add(centralHall);
    [-4.2, 4.2].forEach((x) => {
      const wing = this.createTempleHall(palette, 3.8, 2.9, 3.2, 1.0);
      wing.position.set(x, 1.45, 1.4);
      group.add(wing);
    });
    const rearPagoda = this.createPagoda(palette, 5, 1.35, 9.6);
    rearPagoda.position.set(0, 1.45, -4.6);
    group.add(rearPagoda);
    group.add(this.createBalustrade(palette, 7.3, 6.1, 1.7));
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
    const mainHall = this.createTempleHall(palette, 6.4, 4.7, 4.8, 1.45);
    mainHall.position.y = 1.45;
    group.add(mainHall);
    const pagoda = this.createPagoda(palette, 7, 1.25, 12.4);
    pagoda.position.set(0, 1.45, -4.4);
    group.add(pagoda);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, FEATURE_CONFIG.sectModels.domeSegments, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      this.material(palette.accent, 0.42, 0.18),
    );
    dome.scale.set(0.72, 0.72, 0.72);
    dome.position.set(0, 8.2, -4.4);
    group.add(dome);
    group.add(this.createBalustrade(palette, 6.9, 5.8, 1.55));
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
    const hall = this.createTempleHall(palette, 4.6, 3.4, 3.5, 1.15);
    hall.position.y = 1.45;
    group.add(hall);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.64, 5.4, 28, 4), this.material(0x51402b, 0.9, 0));
    trunk.position.set(0, 4.1, -3.2);
    group.add(trunk);
    const foliageMaterial = this.material(palette.accent, 0.82, 0.01);
    for (let index = 0; index < 7; index += 1) {
      const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 + (index % 3) * 0.22, 3), foliageMaterial);
      const angle = (index / 7) * Math.PI * 2;
      foliage.position.set(Math.cos(angle) * 1.55, 6.2 + (index % 2) * 0.7, -3.2 + Math.sin(angle) * 1.35);
      group.add(foliage);
    }
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
    const mainHall = this.createTempleHall(palette, 5.2, 3.8, 4.1, 1.25);
    mainHall.position.y = 1.45;
    group.add(mainHall);
    [-3.4, 3.4].forEach((x) => {
      const hall = this.createTempleHall(palette, 2.7, 2.2, 2.5, 0.78);
      hall.position.set(x, 1.45, 1.5);
      group.add(hall);
    });
    return group;
  }

  private createTempleHall(
    palette: SectPalette,
    width: number,
    depth: number,
    wallHeight: number,
    roofHeight: number,
  ): THREE.Group {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.14, 0.42, depth * 1.16, 8, 2, 8),
      this.material(palette.stone, 0.84, 0.03),
    );
    base.position.y = 0.21;

    const wall = this.box(width * 0.88, wallHeight, depth * 0.82, palette.stone);
    wall.position.y = 0.48 + wallHeight * 0.5;

    const door = this.box(width * 0.2, wallHeight * 0.72, 0.12, palette.dark);
    door.position.set(0, 0.5 + wallHeight * 0.36, depth * 0.42);

    const roof = this.createTierRoof(palette, Math.max(width, depth) * 0.62, roofHeight);
    roof.scale.z = depth / width;
    roof.position.y = wallHeight + 0.46;
    group.add(base, wall, door, roof);

    const columnMaterial = this.material(palette.roof, 0.58, 0.08);
    const columnsPerSide = Math.max(4, Math.round(width / 1.4));
    for (let index = 0; index < columnsPerSide; index += 1) {
      const t = columnsPerSide === 1 ? 0.5 : index / (columnsPerSide - 1);
      const x = -width * 0.45 + t * width * 0.9;
      for (const z of [-depth * 0.45, depth * 0.45]) {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, wallHeight * 0.96, 20, 3), columnMaterial);
        column.position.set(x, 0.46 + wallHeight * 0.48, z);
        group.add(column);
      }
    }

    const bracketMaterial = this.material(palette.accent, 0.46, 0.14);
    for (let index = 0; index < columnsPerSide; index += 1) {
      const t = index / Math.max(1, columnsPerSide - 1);
      const x = -width * 0.45 + t * width * 0.9;
      const bracket = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.16, 0.18, 3, 0.035), bracketMaterial);
      bracket.position.set(x, wallHeight + 0.34, depth * 0.49);
      group.add(bracket);
    }
    return group;
  }

  private createCurvedRoofGeometry(radius: number, height: number, segments: number): THREE.BufferGeometry {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const rowSize = segments + 1;

    for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
      const v = zIndex / segments;
      const z = (v * 2 - 1) * radius;
      for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
        const u = xIndex / segments;
        const x = (u * 2 - 1) * radius;
        const nx = Math.abs(x / radius);
        const nz = Math.abs(z / radius);
        const edge = Math.max(nx, nz);
        const hip = Math.pow(Math.max(0, 1 - edge), 1.45) * height;
        const upturnedCorner = Math.pow(nx * nz, 3.4) * height * 0.62;
        const subtleCurve = Math.sin((1 - edge) * Math.PI) * height * 0.08;
        vertices.push(x, hip + upturnedCorner + subtleCurve, z);
        uvs.push(u, v);
      }
    }

    for (let zIndex = 0; zIndex < segments; zIndex += 1) {
      for (let xIndex = 0; xIndex < segments; xIndex += 1) {
        const a = zIndex * rowSize + xIndex;
        const b = a + 1;
        const c = a + rowSize;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createBalustrade(palette: SectPalette, width: number, depth: number, y: number): THREE.Group {
    const group = new THREE.Group();
    const material = this.material(palette.accent, 0.52, 0.14);
    const railHeight = 0.68;
    const postCountX = Math.max(6, Math.round(width / 0.75));
    const postCountZ = Math.max(5, Math.round(depth / 0.75));

    [
      { width, depth: 0.09, x: 0, z: depth * 0.5 },
      { width, depth: 0.09, x: 0, z: -depth * 0.5 },
      { width: 0.09, depth, x: width * 0.5, z: 0 },
      { width: 0.09, depth, x: -width * 0.5, z: 0 },
    ].forEach((rail) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(rail.width, 0.1, rail.depth, 3, 0.025), material);
      mesh.position.set(rail.x, y + railHeight, rail.z);
      group.add(mesh);
    });

    for (let index = 0; index < postCountX; index += 1) {
      const x = -width * 0.5 + (index / (postCountX - 1)) * width;
      for (const z of [-depth * 0.5, depth * 0.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, railHeight, 12), material);
        post.position.set(x, y + railHeight * 0.5, z);
        group.add(post);
      }
    }
    for (let index = 1; index < postCountZ - 1; index += 1) {
      const z = -depth * 0.5 + (index / (postCountZ - 1)) * depth;
      for (const x of [-width * 0.5, width * 0.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, railHeight, 12), material);
        post.position.set(x, y + railHeight * 0.5, z);
        group.add(post);
      }
    }
    return group;
  }

  private createPagoda(palette: SectPalette, levels: number, radius: number, height: number): THREE.Group {
    const group = new THREE.Group();
    for (let level = 0; level < levels; level += 1) {
      const t = level / levels;
      const bodyHeight = (height / levels) * 0.56;
      const levelRadius = radius * (1 - t * 0.36);
      const y = 1.2 + level * (height / levels);
      const body = this.box(levelRadius * 1.28, bodyHeight, levelRadius * 1.28, palette.stone);
      body.position.y = y;
      const roof = this.createTierRoof(palette, levelRadius * 1.48, bodyHeight * 0.48);
      roof.position.y = y + bodyHeight * 0.44;
      group.add(body, roof);

      const balcony = new THREE.Mesh(
        new THREE.BoxGeometry(levelRadius * 1.72, 0.08, levelRadius * 1.72, 3, 1, 3),
        this.material(palette.accent, 0.52, 0.14),
      );
      balcony.position.y = y - bodyHeight * 0.46;
      group.add(balcony);
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
      this.createCurvedRoofGeometry(radius, height, FEATURE_CONFIG.sectModels.roofSegments),
      this.material(palette.roof, 0.58, 0.1),
    );
    group.add(roof);

    const fasciaMaterial = this.material(palette.accent, 0.5, 0.16);
    const fasciaDepth = 0.1;
    [
      { x: 0, z: radius, rotation: 0 },
      { x: 0, z: -radius, rotation: 0 },
      { x: radius, z: 0, rotation: Math.PI / 2 },
      { x: -radius, z: 0, rotation: Math.PI / 2 },
    ].forEach((edge) => {
      const fascia = new THREE.Mesh(new RoundedBoxGeometry(radius * 2.05, 0.16, fasciaDepth, 3, 0.035), fasciaMaterial);
      fascia.position.set(edge.x, 0.03, edge.z);
      fascia.rotation.y = edge.rotation;
      group.add(fascia);
    });

    const tileMaterial = this.material(palette.accent, 0.62, 0.1);
    const tileRows = FEATURE_CONFIG.sectModels.roofTileRows;
    for (let row = -tileRows; row <= tileRows; row += 2) {
      const offset = (row / tileRows) * radius * 0.88;
      const ridgeA = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, radius * 1.82, 8), tileMaterial);
      ridgeA.rotation.z = Math.PI / 2;
      ridgeA.position.set(0, height * 0.22 * (1 - Math.abs(offset) / radius), offset);
      const ridgeB = ridgeA.clone();
      ridgeB.rotation.set(Math.PI / 2, 0, 0);
      ridgeB.position.set(offset, height * 0.22 * (1 - Math.abs(offset) / radius), 0);
      group.add(ridgeA, ridgeB);
    }

    for (const x of [-radius, radius]) {
      for (const z of [-radius, radius]) {
        const ornament = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), this.emissiveMaterial(palette.glow, 0.18));
        ornament.position.set(x, height * 0.32, z);
        group.add(ornament);
      }
    }
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
