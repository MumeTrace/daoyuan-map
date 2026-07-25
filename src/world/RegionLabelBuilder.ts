import * as THREE from 'three';
import { TERRAIN_CONFIG } from '../data/mapConfig';
import { GEOGRAPHY_LABELS, GeographyLabelDefinition, REGIONS, RegionDefinition, SECTS, SectDefinition } from '../data/regions';
import { getHostWindow } from '../host/hostDom';
import { TerrainSampler } from '../terrain/TerrainSampler';

const LABEL_TONES: Record<GeographyLabelDefinition['tone'], { fill: string; stroke: string; shadow: string }> = {
  snow: { fill: '#f4fbff', stroke: 'rgba(14, 30, 42, 0.86)', shadow: 'rgba(119, 195, 255, 0.55)' },
  sand: { fill: '#f2d08a', stroke: 'rgba(46, 29, 12, 0.86)', shadow: 'rgba(212, 151, 58, 0.5)' },
  green: { fill: '#d7f0b6', stroke: 'rgba(12, 33, 20, 0.9)', shadow: 'rgba(106, 184, 93, 0.46)' },
  fire: { fill: '#ffcf9a', stroke: 'rgba(55, 12, 8, 0.92)', shadow: 'rgba(255, 69, 24, 0.6)' },
  mountain: { fill: '#d4dde4', stroke: 'rgba(12, 18, 24, 0.9)', shadow: 'rgba(117, 173, 231, 0.42)' },
  gold: { fill: '#f6dfb7', stroke: 'rgba(32, 20, 9, 0.88)', shadow: 'rgba(241, 190, 92, 0.48)' },
};

function createHiDpiCanvas(logicalWidth: number, logicalHeight: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; scale: number } {
  const scale = Math.min(2, Math.max(1, getHostWindow().devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(logicalWidth * scale);
  canvas.height = Math.round(logicalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建标签 Canvas。');
  }
  context.scale(scale, scale);
  return { canvas, context, scale };
}

function configureLabelTexture(texture: THREE.CanvasTexture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
}

export class RegionLabelBuilder {
  /** 创建区域大字标签。Phase 2 先作为地理阅读层，Phase 3 再升级为交互标签。 */
  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '区域名称标签';
    const worldScale = Math.max(1, TERRAIN_CONFIG.worldScale / 1.5);

    REGIONS.forEach((region) => {
      const sprite = this.createLabelSprite(region);
      const position = sampler.sampleNormalized(region.labelPosition, TERRAIN_CONFIG.labelLift);
      sprite.position.set(position.x, position.y, position.z);
      sprite.scale.set(region.labelScale * worldScale, region.labelScale * 0.36 * worldScale, 1);
      group.add(sprite);
    });

    const sectIds = new Set(SECTS.map((sect) => sect.id));
    const regionNames = new Set(REGIONS.map((region) => region.name));
    GEOGRAPHY_LABELS.filter((label) => !sectIds.has(label.id) && !regionNames.has(label.name)).forEach((label) => {
      const sprite = this.createGeographySprite(label);
      const position = sampler.sampleNormalized(label.position, label.lift ?? TERRAIN_CONFIG.labelLift * 0.72);
      sprite.position.set(position.x, position.y, position.z);
      if (label.vertical) {
        sprite.scale.set(label.scale * 0.42 * worldScale, label.scale * 1.55 * worldScale, 1);
      } else {
        sprite.scale.set(label.scale * worldScale, label.scale * 0.34 * worldScale, 1);
      }
      group.add(sprite);
    });

    SECTS.forEach((sect) => {
      const sprite = this.createSectSprite(sect);
      const labelLift = sect.lift ? sect.lift + 23 : TERRAIN_CONFIG.labelLift * 0.74;
      const position = sampler.sampleNormalized(sect.position, labelLift);
      sprite.position.set(position.x, position.y, position.z);
      const scale = (12 + sect.importance * 11) * worldScale;
      sprite.scale.set(scale, scale * 0.34, 1);
      group.add(sprite);
    });

    return group;
  }

  private createLabelSprite(region: RegionDefinition): THREE.Sprite {
    const logicalWidth = 1536;
    const logicalHeight = 512;
    const { canvas, context } = createHiDpiCanvas(logicalWidth, logicalHeight);

    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.font = '700 116px "Microsoft YaHei", "PingFang SC", serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0, 0, 0, 0.76)';
    context.shadowBlur = 16;
    context.lineWidth = 12;
    context.strokeStyle = 'rgba(13, 18, 24, 0.82)';
    context.strokeText(region.name, logicalWidth / 2, logicalHeight / 2);
    context.fillStyle = '#f4dfb9';
    context.fillText(region.name, logicalWidth / 2, logicalHeight / 2);

    const texture = new THREE.CanvasTexture(canvas);
    configureLabelTexture(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = `${region.name}标签`;
    return sprite;
  }

  private createGeographySprite(label: GeographyLabelDefinition): THREE.Sprite {
    const logicalWidth = label.vertical ? 512 : 1280;
    const logicalHeight = label.vertical ? 1536 : 384;
    const { canvas, context } = createHiDpiCanvas(logicalWidth, logicalHeight);

    const tone = LABEL_TONES[label.tone];
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.font = `700 ${label.vertical ? 108 : 96}px "Microsoft YaHei", "PingFang SC", serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = tone.shadow;
    context.shadowBlur = 20;
    context.lineWidth = 11;
    context.strokeStyle = tone.stroke;
    context.fillStyle = tone.fill;

    if (label.vertical) {
      const chars = Array.from(label.name);
      const startY = logicalHeight / 2 - ((chars.length - 1) * 116) / 2;
      chars.forEach((char, index) => {
        const y = startY + index * 116;
        context.strokeText(char, logicalWidth / 2, y);
        context.fillText(char, logicalWidth / 2, y);
      });
    } else {
      context.strokeText(label.name, logicalWidth / 2, logicalHeight / 2);
      context.fillText(label.name, logicalWidth / 2, logicalHeight / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    configureLabelTexture(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.94,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = `${label.name}地理标签`;
    return sprite;
  }

  private createSectSprite(sect: SectDefinition): THREE.Sprite {
    const logicalWidth = 1024;
    const logicalHeight = 320;
    const { canvas, context } = createHiDpiCanvas(logicalWidth, logicalHeight);

    const tone = LABEL_TONES[sect.tone];
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = tone.shadow;
    context.shadowBlur = 18;
    context.lineWidth = 9;
    context.strokeStyle = tone.stroke;
    context.fillStyle = tone.fill;
    context.font = '800 82px "Microsoft YaHei", "PingFang SC", serif';
    context.strokeText(sect.name, logicalWidth / 2, logicalHeight / 2 - 22);
    context.fillText(sect.name, logicalWidth / 2, logicalHeight / 2 - 22);
    context.shadowBlur = 7;
    context.lineWidth = 4;
    context.font = '600 34px "Microsoft YaHei", "PingFang SC", serif';
    context.strokeText(`${sect.category} · ${sect.area}`, logicalWidth / 2, logicalHeight / 2 + 58);
    context.fillText(`${sect.category} · ${sect.area}`, logicalWidth / 2, logicalHeight / 2 + 58);

    const texture = new THREE.CanvasTexture(canvas);
    configureLabelTexture(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.96,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = `${sect.name}宗门信息标签`;
    return sprite;
  }
}
