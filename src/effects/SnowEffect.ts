import * as THREE from 'three';
import { SNOW_EFFECT_CONFIG } from '../data/mapConfig';
import { TerrainSampler } from '../terrain/TerrainSampler';

type SnowParticle = {
  baseX: number;
  baseZ: number;
  groundY: number;
  topY: number;
  span: number;
  speed: number;
  phase: number;
  drift: number;
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建雪花粒子纹理。');
  }

  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.38, 'rgba(240,250,255,0.72)');
  gradient.addColorStop(1, 'rgba(240,250,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 1.25;
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    context.beginPath();
    context.moveTo(32, 32);
    context.lineTo(32 + Math.cos(angle) * 18, 32 + Math.sin(angle) * 18);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'north-snowflake-particle';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export class SnowEffect {
  private readonly random = createSeededRandom(20260716 + 510);

  build(sampler: TerrainSampler): THREE.Group {
    const group = new THREE.Group();
    group.name = '北冥雪原下雪特效';
    if (!SNOW_EFFECT_CONFIG.enabled) {
      return group;
    }

    const particles = this.createParticles(sampler);
    const positions = new Float32Array(particles.length * 3);
    this.writePositions(positions, particles, 0);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 55, -270), 420);

    const material = new THREE.PointsMaterial({
      map: createSnowflakeTexture(),
      color: 0xf4fbff,
      size: SNOW_EFFECT_CONFIG.particleSize,
      transparent: true,
      opacity: SNOW_EFFECT_CONFIG.opacity,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.name = '北冥雪原飘雪粒子';
    points.frustumCulled = false;
    group.add(points);
    group.userData.update = (elapsedSeconds: number) => {
      this.writePositions(positions, particles, elapsedSeconds);
      geometry.attributes.position.needsUpdate = true;
    };
    group.userData.snowStats = {
      particleCount: particles.length,
      area: '北冥雪原',
      liftRange: `${SNOW_EFFECT_CONFIG.minLift}-${SNOW_EFFECT_CONFIG.maxLift}`,
    };
    console.info('[玄天界雪原特效]', group.userData.snowStats);

    return group;
  }

  private createParticles(sampler: TerrainSampler): SnowParticle[] {
    const particles: SnowParticle[] = [];
    let attempts = 0;
    const maxAttempts = SNOW_EFFECT_CONFIG.particleCount * 8;

    while (particles.length < SNOW_EFFECT_CONFIG.particleCount && attempts < maxAttempts) {
      attempts += 1;
      const localX = lerp(-1, 1, this.random());
      const localZ = lerp(-1, 1, this.random());
      if (localX * localX + localZ * localZ > 1) {
        continue;
      }

      const nx = SNOW_EFFECT_CONFIG.center.x + localX * SNOW_EFFECT_CONFIG.radius.x;
      const nz = SNOW_EFFECT_CONFIG.center.z + localZ * SNOW_EFFECT_CONFIG.radius.z;
      if (nx < 0.04 || nx > 0.9 || nz < 0.03 || nz > 0.42) {
        continue;
      }

      const world = sampler.normalizedToWorld({ x: nx, z: nz });
      const details = sampler.sampleDetails(world.x, world.z);
      if (details.regionWeights.snow < 0.2 && details.regionWeights.mountain < 0.16) {
        continue;
      }

      const groundY = details.height + 1.8;
      const span = lerp(SNOW_EFFECT_CONFIG.minLift, SNOW_EFFECT_CONFIG.maxLift, this.random());
      particles.push({
        baseX: world.x,
        baseZ: world.z,
        groundY,
        topY: groundY + span,
        span,
        speed: lerp(SNOW_EFFECT_CONFIG.fallSpeed.min, SNOW_EFFECT_CONFIG.fallSpeed.max, this.random()),
        phase: this.random(),
        drift: lerp(1.5, SNOW_EFFECT_CONFIG.windStrength, this.random()),
      });
    }

    return particles;
  }

  private writePositions(positions: Float32Array, particles: SnowParticle[], elapsedSeconds: number): void {
    particles.forEach((particle, index) => {
      const cycle = (particle.phase + (elapsedSeconds * particle.speed) / particle.span) % 1;
      const wind = Math.sin(elapsedSeconds * SNOW_EFFECT_CONFIG.windSpeed + particle.phase * Math.PI * 2) * particle.drift;
      const flutter = Math.cos(elapsedSeconds * 1.4 + particle.phase * 9.7) * particle.drift * 0.42;
      const offset = index * 3;
      positions[offset] = particle.baseX + wind + cycle * 12;
      positions[offset + 1] = particle.topY - cycle * particle.span;
      positions[offset + 2] = particle.baseZ + flutter;
    });
  }
}
