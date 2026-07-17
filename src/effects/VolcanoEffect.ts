import * as THREE from 'three';
import { MAIN_VOLCANO_CONFIG } from '../data/mapConfig';
import { TerrainSampler } from '../terrain/TerrainSampler';

type AnimatedSprite = THREE.Sprite & {
  userData: {
    origin: THREE.Vector3;
    speed: number;
    drift: number;
    phase: number;
    maxRise: number;
    baseScale: number;
  };
};

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

function createRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建火山粒子纹理。');
  }
  const gradient = context.createRadialGradient(48, 48, 4, 48, 48, 48);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'volcano-radial-particle';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export class VolcanoEffect {
  private readonly random = createSeededRandom(20260716 + 160);

  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '南离主火山火光烟雾';
    const center = sampler.sampleNormalized({ x: MAIN_VOLCANO_CONFIG.centerX, z: MAIN_VOLCANO_CONFIG.centerZ }, 9);
    const centerVector = new THREE.Vector3(center.x, center.y, center.z);

    const light = new THREE.PointLight(0xff5a22, MAIN_VOLCANO_CONFIG.lightIntensity, MAIN_VOLCANO_CONFIG.lightDistance, 2.25);
    light.name = '主火山口火光';
    light.position.copy(centerVector).add(new THREE.Vector3(0, 10, 0));
    group.add(light);

    const smokeTexture = createRadialTexture('rgba(86, 78, 72, 0.42)', 'rgba(86, 78, 72, 0)');
    const emberTexture = createRadialTexture('rgba(255, 167, 62, 0.95)', 'rgba(255, 70, 20, 0)');
    const smokeSprites = this.createSmokeSprites(centerVector, smokeTexture);
    const emberSprites = this.createEmberSprites(centerVector, emberTexture);
    group.add(...smokeSprites, ...emberSprites);
    group.userData.update = (elapsedSeconds: number) => {
      const pulse = 0.85 + Math.sin(elapsedSeconds * 2.6) * 0.15 + Math.sin(elapsedSeconds * 5.1) * 0.05;
      light.intensity = MAIN_VOLCANO_CONFIG.lightIntensity * pulse;
      this.updateSprites(smokeSprites, elapsedSeconds, false);
      this.updateSprites(emberSprites, elapsedSeconds, true);
    };

    return group;
  }

  private createSmokeSprites(center: THREE.Vector3, texture: THREE.Texture): AnimatedSprite[] {
    const sprites: AnimatedSprite[] = [];
    for (let index = 0; index < MAIN_VOLCANO_CONFIG.smokeParticleCount; index += 1) {
      const radius = 2 + this.random() * 9;
      const angle = this.random() * Math.PI * 2;
      const origin = center.clone().add(new THREE.Vector3(Math.cos(angle) * radius, this.random() * 18, Math.sin(angle) * radius));
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: 0x5f5955,
        transparent: true,
        opacity: 0.16 + this.random() * 0.16,
        depthWrite: false,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(material) as AnimatedSprite;
      sprite.name = '火山烟雾粒子';
      sprite.position.copy(origin);
      const baseScale = 12 + this.random() * 18;
      sprite.scale.setScalar(baseScale);
      sprite.userData = {
        origin,
        speed: 0.07 + this.random() * 0.08,
        drift: 2.5 + this.random() * 7,
        phase: this.random() * Math.PI * 2,
        maxRise: 42 + this.random() * 34,
        baseScale,
      };
      sprites.push(sprite);
    }
    return sprites;
  }

  private createEmberSprites(center: THREE.Vector3, texture: THREE.Texture): AnimatedSprite[] {
    const sprites: AnimatedSprite[] = [];
    for (let index = 0; index < MAIN_VOLCANO_CONFIG.emberParticleCount; index += 1) {
      const radius = 1 + this.random() * 5;
      const angle = this.random() * Math.PI * 2;
      const origin = center.clone().add(new THREE.Vector3(Math.cos(angle) * radius, this.random() * 8, Math.sin(angle) * radius));
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: 0xff7a24,
        transparent: true,
        opacity: 0.38 + this.random() * 0.3,
        depthWrite: false,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(material) as AnimatedSprite;
      sprite.name = '火山火星粒子';
      sprite.position.copy(origin);
      const baseScale = 2.2 + this.random() * 3.6;
      sprite.scale.setScalar(baseScale);
      sprite.userData = {
        origin,
        speed: 0.18 + this.random() * 0.16,
        drift: 1.2 + this.random() * 3.5,
        phase: this.random() * Math.PI * 2,
        maxRise: 16 + this.random() * 20,
        baseScale,
      };
      sprites.push(sprite);
    }
    return sprites;
  }

  private updateSprites(sprites: AnimatedSprite[], elapsedSeconds: number, ember: boolean): void {
    sprites.forEach((sprite) => {
      const cycle = (elapsedSeconds * sprite.userData.speed + sprite.userData.phase) % 1;
      const rise = cycle * sprite.userData.maxRise;
      const sway = Math.sin(elapsedSeconds * 0.7 + sprite.userData.phase) * sprite.userData.drift;
      sprite.position.set(
        sprite.userData.origin.x + sway,
        sprite.userData.origin.y + rise,
        sprite.userData.origin.z + Math.cos(elapsedSeconds * 0.55 + sprite.userData.phase) * sprite.userData.drift * 0.42,
      );
      const fade = ember ? 1 - cycle : Math.sin(cycle * Math.PI);
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = (ember ? 0.54 : 0.22) * Math.max(0, fade);
      sprite.scale.setScalar(sprite.userData.baseScale * (ember ? 1 + cycle * 0.2 : 0.75 + cycle * 0.95));
    });
  }
}
