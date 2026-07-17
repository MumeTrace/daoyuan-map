import * as THREE from 'three';
import { ASSET_CONFIG, RENDER_QUALITY_CONFIG, TERRAIN_TEXTURE_CONFIG } from '../data/mapConfig';
import { resolveAssetUrl } from './AssetUrlResolver';

type TerrainTextureRole = 'baseColor' | 'normal' | 'orm' | 'emissive';

export type TerrainTextureSet = Partial<Record<TerrainTextureRole, THREE.Texture>>;

const TERRAIN_TEXTURE_FILES: Record<TerrainTextureRole, (quality: string) => string> = {
  baseColor: (quality) => `terrain-basecolor-${quality}.webp`,
  normal: (quality) => `terrain-normal-${quality}.png`,
  orm: (quality) => `terrain-orm-${quality}.png`,
  emissive: (quality) => `terrain-emissive-${quality}.webp`,
};

export class TextureManager {
  private readonly loader = new THREE.TextureLoader();
  private readonly texturePromises = new Map<string, Promise<THREE.Texture>>();
  private readonly anisotropy = RENDER_QUALITY_CONFIG.levels[RENDER_QUALITY_CONFIG.default].anisotropy;
  private readonly quality = TERRAIN_TEXTURE_CONFIG.defaultQuality;

  applyTerrainTextures(material: THREE.MeshStandardMaterial): void {
    const startedAt = performance.now();
    const mode = TERRAIN_TEXTURE_CONFIG.terrainLineDebugMode;
    if (mode === 'vertex-color-only' || mode === 'geometry-lines-only' || mode === 'debug-paths-only' || mode === 'boundaries-only' || mode === 'roads-only') {
      console.info('[玄天界地形 PBR 贴图] 诊断模式跳过全部贴图', { mode });
      return;
    }

    this.loadTerrainTextureSet()
      .then((textures) => {
        const disposableTextures = new Set<THREE.Texture>();

        if (textures.baseColor) {
          material.map = textures.baseColor;
          disposableTextures.add(textures.baseColor);
        }

        if (textures.normal && mode !== 'normal-disabled' && mode !== 'basecolor-only') {
          material.normalMap = textures.normal;
          material.normalScale = new THREE.Vector2(
            TERRAIN_TEXTURE_CONFIG.levels[this.quality].normalScale,
            TERRAIN_TEXTURE_CONFIG.levels[this.quality].normalScale,
          );
          disposableTextures.add(textures.normal);
        }

        if (textures.orm && mode !== 'basecolor-only') {
          if (mode !== 'roughness-disabled') {
            material.roughnessMap = textures.orm;
          }
          if (mode !== 'ao-disabled') {
            material.aoMap = textures.orm;
          }
          material.aoMapIntensity = TERRAIN_TEXTURE_CONFIG.levels[this.quality].aoMapIntensity;
          disposableTextures.add(textures.orm);
        }

        if (textures.emissive && mode !== 'basecolor-only') {
          material.emissiveMap = textures.emissive;
          material.emissive = new THREE.Color(0xffffff);
          material.emissiveIntensity = TERRAIN_TEXTURE_CONFIG.levels[this.quality].emissiveIntensity;
          disposableTextures.add(textures.emissive);
        }

        material.userData.disposableTextures = Array.from(disposableTextures);
        material.needsUpdate = true;
        console.info('[玄天界地形 PBR 贴图]', {
          quality: this.quality,
          mode,
          loaded: Object.keys(textures),
          elapsedMs: (performance.now() - startedAt).toFixed(1),
          anisotropy: this.anisotropy,
          mipmap: true,
        });
      })
      .catch((error) => {
        console.warn('[玄天界地形 PBR 贴图] 全部加载失败，保持稳定顶点色材质。', error);
      });
  }

  private async loadTerrainTextureSet(): Promise<TerrainTextureSet> {
    const jobs: Array<Promise<[TerrainTextureRole, THREE.Texture] | null>> = [
      this.loadTextureRole('baseColor', THREE.SRGBColorSpace),
      this.loadTextureRole('normal', THREE.NoColorSpace),
      this.loadTextureRole('orm', THREE.NoColorSpace),
      this.loadTextureRole('emissive', THREE.SRGBColorSpace),
    ];
    const results = await Promise.all(jobs);
    const textures: TerrainTextureSet = {};
    results.forEach((result) => {
      if (result) {
        textures[result[0]] = result[1];
      }
    });

    if (Object.keys(textures).length === 0) {
      throw new Error('没有任何地形贴图加载成功。');
    }

    return textures;
  }

  private async loadTextureRole(role: TerrainTextureRole, colorSpace: THREE.ColorSpace): Promise<[TerrainTextureRole, THREE.Texture] | null> {
    const fileName = TERRAIN_TEXTURE_FILES[role](this.quality);
    const relativePath = `${ASSET_CONFIG.terrainTexturePath}/${fileName}`;
    const url = resolveAssetUrl(relativePath);

    try {
      const texture = await this.loadTexture(url, colorSpace);
      texture.name = `terrain-${role}-${this.quality}`;
      return [role, texture];
    } catch (error) {
      console.warn(`[玄天界地形 PBR 贴图] ${role} 加载失败，已降级跳过：${url}`, error);
      return null;
    }
  }

  private loadTexture(url: string, colorSpace: THREE.ColorSpace): Promise<THREE.Texture> {
    const cached = this.texturePromises.get(url);
    if (cached) {
      return cached;
    }

    const promise = this.loader.loadAsync(url).then((texture) => {
      texture.colorSpace = colorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = this.anisotropy;
      texture.needsUpdate = true;
      return texture;
    });
    this.texturePromises.set(url, promise);
    return promise;
  }
}
