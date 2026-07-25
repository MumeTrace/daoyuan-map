import * as THREE from 'three';
import { TextureManager } from '../assets/TextureManager';
import { TerrainSample } from './TerrainHeight';

const COLORS = {
  water: new THREE.Color(0x214f63),
  abyssIce: new THREE.Color(0x193a54),
  grass: new THREE.Color(0x557f3c),
  highGrass: new THREE.Color(0x91a95b),
  snow: new THREE.Color(0xfbfdff),
  snowShade: new THREE.Color(0xb9ceda),
  ice: new THREE.Color(0x86bed4),
  sand: new THREE.Color(0xb68a46),
  dune: new THREE.Color(0xd6b467),
  forest: new THREE.Color(0x285f34),
  forestHigh: new THREE.Color(0x5f8e48),
  forestFloor: new THREE.Color(0x354d2d),
  basalt: new THREE.Color(0x2b2422),
  ash: new THREE.Color(0x51352d),
  bloodRock: new THREE.Color(0x64231d),
  lava: new THREE.Color(0xff4d18),
  lavaHot: new THREE.Color(0xffb84a),
  mountain: new THREE.Color(0x56666e),
  mountainSnow: new THREE.Color(0xe0edf3),
};

function mixInto(base: THREE.Color, color: THREE.Color, weight: number): void {
  base.lerp(color, Math.min(1, Math.max(0, weight)));
}

function addWeighted(target: THREE.Color, color: THREE.Color, weight: number): void {
  target.r += color.r * weight;
  target.g += color.g * weight;
  target.b += color.b * weight;
}

export class TerrainMaterial {
  private readonly textureManager = new TextureManager();

  /** 根据区域权重、高度和裂谷信息计算顶点颜色。 */
  getVertexColor(sample: TerrainSample, normal: THREE.Vector3, worldX: number, worldZ: number): THREE.Color {
    const { snow, desert, central, forest, fire, mountain } = sample.regionWeights;
    const { snowAbyss, desertBasin, forestValley, bloodSea } = sample.regionFeatures;
    const heightFactor = Math.min(1, Math.max(0, (sample.height + 10) / 105));
    const slope = Math.min(1, Math.max(0, 1 - normal.y));
    const colorNoise = Math.sin(worldX * 0.031 + worldZ * 0.019) * 0.32 + Math.sin(worldX * 0.009 - worldZ * 0.041) * 0.18 + 0.5;
    const valleyFactor = Math.min(1, sample.valley / 18);
    const erosionFactor = Math.min(1, sample.erosion / 16);
    const volcanoFactor = Math.min(1, Math.max(sample.volcano / 30, sample.lava * 0.82));
    const weights = [
      { color: COLORS.snow, weight: Math.pow(snow, 1.65) * (2.45 + heightFactor * 0.75) },
      { color: COLORS.dune, weight: Math.pow(desert, 1.75) * 1.95 },
      { color: COLORS.grass, weight: Math.pow(central, 1.65) * 1.62 },
      { color: COLORS.forest, weight: Math.pow(forest, 1.62) * 1.86 },
      { color: COLORS.ash, weight: Math.pow(fire, 1.72) * 2.35 },
      { color: COLORS.mountain, weight: Math.pow(mountain, 1.7) * 1.72 },
      { color: COLORS.highGrass, weight: 0.035 },
    ];

    const color = new THREE.Color(0, 0, 0);
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    weights.forEach((item) => addWeighted(color, item.color, item.weight / totalWeight));

    mixInto(color, COLORS.snowShade, snow * slope * 0.26);
    mixInto(color, COLORS.ice, snow * heightFactor * 0.14);
    mixInto(color, COLORS.snow, snow * (0.3 + Math.max(0, heightFactor - 0.22) * 1.05));
    mixInto(color, COLORS.sand, desert * (0.22 + (1 - heightFactor) * 0.16));
    mixInto(color, COLORS.forestHigh, forest * heightFactor * 0.18);
    mixInto(color, COLORS.forestFloor, forestValley * 0.2);
    mixInto(color, COLORS.basalt, fire * (0.23 + slope * 0.23));
    mixInto(color, COLORS.ash, fire * (0.16 + heightFactor * 0.13));
    mixInto(color, COLORS.mountain, slope * 0.34 + erosionFactor * 0.14);
    mixInto(color, COLORS.mountainSnow, mountain * heightFactor * 0.28);
    mixInto(color, COLORS.highGrass, central * (1 - slope) * colorNoise * 0.12);
    mixInto(color, COLORS.dune, desert * colorNoise * 0.1);
    mixInto(color, COLORS.grass, valleyFactor * central * 0.14);
    mixInto(color, COLORS.water, valleyFactor * 0.12);
    mixInto(color, COLORS.abyssIce, snowAbyss * 0.72);
    mixInto(color, COLORS.ice, snowAbyss * slope * 0.18);
    mixInto(color, COLORS.dune, desertBasin * 0.17);
    mixInto(color, COLORS.forest, forestValley * 0.16);
    mixInto(color, COLORS.bloodRock, bloodSea * 0.58);

    if (volcanoFactor > 0.05) {
      mixInto(color, COLORS.basalt, Math.min(0.68, volcanoFactor * 0.76));
      mixInto(color, COLORS.ash, Math.min(0.28, volcanoFactor * colorNoise * 0.26));
    }

    if (sample.lava > 0.32) {
      mixInto(color, COLORS.lava, Math.min(0.64, (sample.lava - 0.22) * 0.82));
      mixInto(color, COLORS.lavaHot, Math.min(0.26, (sample.lava - 0.26) * 0.34));
    }

    if (sample.river > 1.2) {
      mixInto(color, COLORS.water, Math.min(0.82, sample.river / 10));
    }

    return color;
  }

  /** 创建稳定的顶点色地形材质，确保所有 WebGL 环境中地形可见。 */
  createMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      side: THREE.FrontSide,
    });
    material.name = '玄天界稳定 PBR 地形材质';
    this.textureManager.applyTerrainTextures(material);
    return material;
  }
}
