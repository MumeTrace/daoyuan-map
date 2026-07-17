import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import { MAIN_VOLCANO_CONFIG, TERRAIN_CONFIG, TERRAIN_TEXTURE_CONFIG } from '../../src/data/mapConfig';
import { TerrainHeight, TerrainSample } from '../../src/terrain/TerrainHeight';
import { normalizedToWorld } from '../../src/utils/MapCoordinateSystem';

type Quality = keyof typeof TERRAIN_TEXTURE_CONFIG.levels;
type Rgb = [number, number, number];
type TextureStats = {
  baseLuminanceMin: number;
  baseLuminanceMax: number;
  baseDarkPixelRatio: number;
  normalMaxGradient: number;
  aoMin: number;
  roughnessMin: number;
  roughnessMax: number;
};

const OUT_DIR = resolve('public/textures/terrain/generated');
const heightModel = new TerrainHeight();
const bakeStats: TextureStats = {
  baseLuminanceMin: 1,
  baseLuminanceMax: 0,
  baseDarkPixelRatio: 0,
  normalMaxGradient: 0,
  aoMin: 1,
  roughnessMin: 1,
  roughnessMax: 0,
};
let basePixelCount = 0;
let baseDarkPixels = 0;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function mix(a: number, b: number, t: number): number {
  const left = Number.isFinite(a) ? a : 0;
  const right = Number.isFinite(b) ? b : 0;
  return left + (right - left) * clamp01(t);
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash(u: number, v: number, seed: number): number {
  return fract(Math.sin(u * 127.1 + v * 311.7 + seed * 41.13) * 43758.5453123);
}

function noise(u: number, v: number, scale: number, seed: number): number {
  const x = u * scale;
  const y = v * scale;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}

function fbm(u: number, v: number, seed: number): number {
  return noise(u, v, 3, seed) * 0.38 + noise(u, v, 8, seed + 11) * 0.28 + noise(u, v, 19, seed + 23) * 0.2 + noise(u, v, 47, seed + 37) * 0.14;
}

function stripe(u: number, v: number, angle: number, frequency: number, width: number): number {
  const axis = Math.cos(angle) * u + Math.sin(angle) * v;
  const wave = Math.abs(fract(axis * frequency) - 0.5) * 2;
  return 1 - smoothstep(width, width + 0.11, wave);
}

function softBand(u: number, v: number, angle: number, frequency: number, width: number, seed: number): number {
  const breakup = smoothstep(0.24, 0.82, fbm(u * 1.8 + seed * 0.01, v * 1.8 - seed * 0.01, seed));
  return stripe(u + (fbm(u, v, seed + 7) - 0.5) * 0.035, v, angle, frequency, width) * breakup;
}

function shortCracks(u: number, v: number, seed: number): number {
  const cellScale = 18;
  const cx = Math.floor(u * cellScale);
  const cy = Math.floor(v * cellScale);
  const localU = fract(u * cellScale) - 0.5;
  const localV = fract(v * cellScale) - 0.5;
  const chance = hash(cx, cy, seed);
  if (chance < 0.72) {
    return 0;
  }
  const angle = hash(cx, cy, seed + 3) * Math.PI;
  const along = Math.cos(angle) * localU + Math.sin(angle) * localV;
  const across = Math.abs(-Math.sin(angle) * localU + Math.cos(angle) * localV);
  const length = 0.16 + hash(cx, cy, seed + 5) * 0.18;
  const line = (1 - smoothstep(0.012, 0.04, across)) * (1 - smoothstep(length * 0.55, length, Math.abs(along)));
  return line * (0.35 + hash(cx, cy, seed + 11) * 0.45);
}

function lineDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / (abx * abx + abz * abz || 1)));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

function ellipse(nx: number, nz: number, cx: number, cz: number, rx: number, rz: number): number {
  const dx = (nx - cx) / rx;
  const dz = (nz - cz) / rz;
  return 1 - smoothstep(0.48, 1.16, Math.hypot(dx, dz));
}

function regionApprox(nx: number, nz: number): TerrainSample['regionWeights'] {
  const mountain = Math.max(
    ellipse(nx, nz, 0.89, 0.28, 0.2, 0.38),
    1 - smoothstep(0.025, 0.18, Math.min(nx, nz, 1 - nx, 1 - nz)),
    1 - smoothstep(0.025, 0.16, lineDistance(nx, nz, 0.72, 0.1, 0.96, 0.77)),
  );
  const raw = {
    snow: ellipse(nx, nz, 0.47, 0.2, 0.34, 0.24),
    desert: ellipse(nx, nz, 0.18, 0.54, 0.27, 0.36),
    central: ellipse(nx, nz, 0.5, 0.56, 0.34, 0.29),
    forest: ellipse(nx, nz, 0.79, 0.53, 0.27, 0.33),
    fire: ellipse(nx, nz, 0.53, 0.84, 0.38, 0.21),
    mountain,
  };
  const sum = Math.max(0.0001, raw.snow + raw.desert + raw.central + raw.forest + raw.fire + raw.mountain);
  return {
    snow: raw.snow / sum,
    desert: raw.desert / sum,
    central: raw.central / sum,
    forest: raw.forest / sum,
    fire: raw.fire / sum,
    mountain: raw.mountain / sum,
  };
}

function lavaWeight(nx: number, nz: number): number {
  const craterDistance = Math.hypot(nx - MAIN_VOLCANO_CONFIG.centerX, nz - MAIN_VOLCANO_CONFIG.centerZ);
  const crater = 1 - smoothstep(MAIN_VOLCANO_CONFIG.craterRadius * 0.45, MAIN_VOLCANO_CONFIG.craterRadius * 1.45, craterDistance);
  const channels = [
    lineDistance(nx, nz, 0.56, 0.84, 0.44, 0.915),
    lineDistance(nx, nz, 0.56, 0.84, 0.67, 0.892),
    lineDistance(nx, nz, 0.56, 0.84, 0.57, 0.96),
  ];
  const channel = Math.max(...channels.map((distance) => 1 - smoothstep(0.003, MAIN_VOLCANO_CONFIG.lavaChannelWidth, distance)));
  const fire = ellipse(nx, nz, 0.53, 0.84, 0.38, 0.21);
  return clamp01(Math.max(crater, channel) * fire);
}

function rgb(hex: number): Rgb {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function mixColor(a: Rgb, b: Rgb, t: number): Rgb {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

function addDetailColor(color: Rgb, amount: number): Rgb {
  return [clamp01(color[0] / 255 + amount) * 255, clamp01(color[1] / 255 + amount) * 255, clamp01(color[2] / 255 + amount) * 255];
}

function sanitizeColor(color: Rgb): Rgb {
  return color.map((channel) => clamp01(channel / 255) * 255) as Rgb;
}

function sampleAt(nx: number, nz: number): TerrainSample {
  const world = normalizedToWorld({ x: nx, z: nz });
  return heightModel.sample(world.x, world.z);
}

function estimateSlope(nx: number, nz: number, sample: TerrainSample): number {
  return clamp01(sample.mountainInfluence * 0.55 + sample.erosion / 20 + sample.contributions.ridgeHeight / 42);
}

function baseColor(nx: number, nz: number, sample: TerrainSample): Rgb {
  const weights = sample.regionWeights;
  const slope = estimateSlope(nx, nz, sample);
  const lava = lavaWeight(nx, nz);
  const wet = clamp01(sample.valley / 18 + sample.river / 7);
  const macro = fbm(nx, nz, 17);
  const grassPatch = fbm(nx, nz, 71);
  const sandWave = softBand(nx + Math.sin(nz * 7) * 0.012, nz, 0.63, 18, 0.38, 31);
  const snowWind = softBand(nx, nz, -0.22, 24, 0.32, 43);
  const rockStrata = softBand(nx, nz + sample.height * 0.0015, 0.08, 18, 0.22, 59);
  const volcanicCrack = shortCracks(nx, nz, 79) * weights.fire;

  let color: Rgb = rgb(0x668f43);
  color = mixColor(color, rgb(0x286f39), weights.forest * 0.75);
  color = mixColor(color, rgb(0x95734c), smoothstep(0.62, 0.9, grassPatch) * (weights.central + weights.forest * 0.5) * 0.45);
  color = mixColor(color, rgb(0xd6a862), weights.desert * 0.92);
  color = mixColor(color, rgb(0xeccf8a), weights.desert * sandWave * 0.12);
  color = mixColor(color, rgb(0x5a646a), clamp01(weights.mountain * 0.82 + slope * 0.54));
  color = mixColor(color, rgb(0x879196), rockStrata * slope * weights.mountain * 0.16);
  color = mixColor(color, rgb(0xf6fbff), weights.snow * 0.82);
  color = mixColor(color, rgb(0xaec9d6), weights.snow * slope * 0.34 + weights.snow * snowWind * 0.16);
  color = mixColor(color, rgb(0x171515), weights.fire * 0.86);
  color = mixColor(color, rgb(0x442b24), weights.fire * (0.2 + volcanicCrack * 0.1));
  color = mixColor(color, rgb(0x294657), wet * 0.22);
  color = addDetailColor(color, (macro - 0.5) * 0.12 + (rockStrata - 0.5) * slope * weights.mountain * 0.035);
  color = mixColor(color, rgb(0xff5a1e), lava * 0.72);
  color = mixColor(color, rgb(0xffcf64), Math.pow(lava, 2.5) * 0.35);
  color = sanitizeColor(color);
  const luminance = clamp01((color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722) / 255);
  bakeStats.baseLuminanceMin = Math.min(bakeStats.baseLuminanceMin, luminance);
  bakeStats.baseLuminanceMax = Math.max(bakeStats.baseLuminanceMax, luminance);
  basePixelCount += 1;
  if (luminance < 0.12) {
    baseDarkPixels += 1;
  }
  return color;
}

function detailHeight(nx: number, nz: number): number {
  const weights = regionApprox(nx, nz);
  const grass = fbm(nx, nz, 101) * 0.28 + Math.pow(fbm(nx, nz, 107), 2) * 0.26;
  const sand = softBand(nx + Math.sin(nz * 8) * 0.016, nz, 0.66, 24, 0.36, 181) * 0.16 + fbm(nx, nz, 183) * 0.08;
  const snow = softBand(nx, nz, -0.25, 28, 0.34, 191) * 0.1 + fbm(nx, nz, 131) * 0.08;
  const rock = softBand(nx, nz, 0.06, 24, 0.28, 199) * 0.18 + shortCracks(nx, nz, 211) * 0.16 + fbm(nx, nz, 213) * 0.12;
  const volcanic = shortCracks(nx, nz, 229) * 0.28 + fbm(nx, nz, 151) * 0.16;
  const lava = lavaWeight(nx, nz) * 0.5;
  return (
    grass * (weights.central + weights.forest) * 0.55 +
    sand * weights.desert * 0.85 +
    snow * weights.snow * 0.58 +
    rock * Math.max(weights.mountain, 0.05) * 0.65 +
    volcanic * weights.fire * 0.72 +
    lava
  );
}

function normalAt(nx: number, nz: number, pixelStep: number): Rgb {
  const left = detailHeight(nx - pixelStep, nz);
  const right = detailHeight(nx + pixelStep, nz);
  const down = detailHeight(nx, nz - pixelStep);
  const up = detailHeight(nx, nz + pixelStep);
  const strength = 2.8;
  let x = (left - right) * strength;
  let y = (down - up) * strength;
  bakeStats.normalMaxGradient = Math.max(bakeStats.normalMaxGradient, Math.hypot(x, y));
  let z = 1;
  const length = Math.hypot(x, y, z) || 1;
  x /= length;
  y /= length;
  z /= length;
  return [(x * 0.5 + 0.5) * 255, (y * 0.5 + 0.5) * 255, (z * 0.5 + 0.5) * 255];
}

function ormAt(nx: number, nz: number, sample: TerrainSample): Rgb {
  const weights = sample.regionWeights;
  const slope = estimateSlope(nx, nz, sample);
  const lava = lavaWeight(nx, nz);
  const wet = clamp01(sample.valley / 18 + sample.river / 7);
  const cracks = shortCracks(nx, nz, 241);
  const ao = Math.max(0.68, clamp01(0.96 - sample.valley / 75 - slope * 0.08 - cracks * weights.fire * 0.08));
  let roughness = 0.88;
  roughness = mix(roughness, 0.92, weights.central + weights.forest);
  roughness = mix(roughness, 0.9, weights.desert);
  roughness = mix(roughness, 0.74, weights.snow);
  roughness = mix(roughness, 0.84, weights.mountain);
  roughness = mix(roughness, 0.9, weights.fire);
  roughness = mix(roughness, 0.58, wet);
  roughness = mix(roughness, 0.34, lava);
  roughness = clamp01(roughness);
  bakeStats.aoMin = Math.min(bakeStats.aoMin, ao);
  bakeStats.roughnessMin = Math.min(bakeStats.roughnessMin, roughness);
  bakeStats.roughnessMax = Math.max(bakeStats.roughnessMax, roughness);
  return [ao * 255, roughness * 255, 0];
}

function emissiveAt(nx: number, nz: number): Rgb {
  const lava = lavaWeight(nx, nz);
  if (lava <= 0.015) {
    return [0, 0, 0];
  }
  return [255 * Math.pow(lava, 0.55), 82 * Math.pow(lava, 0.8), 18 * lava];
}

async function writeImage(buffer: Buffer, width: number, height: number, file: string, type: 'png' | 'webp'): Promise<number> {
  const image = sharp(buffer, { raw: { width, height, channels: 4 } });
  if (type === 'webp') {
    await image.webp({ quality: 88, effort: 5 }).toFile(file);
  } else {
    await image.png({ compressionLevel: 8, adaptiveFiltering: true }).toFile(file);
  }
  return (await stat(file)).size;
}

function createBuffer(width: number, height: number, sampler: (nx: number, nz: number, pixelStep: number) => Rgb): Buffer {
  const buffer = Buffer.alloc(width * height * 4);
  const pixelStep = 1 / Math.max(width, height);
  for (let y = 0; y < height; y += 1) {
    const nz = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1);
      const [r, g, b] = sampler(nx, nz, pixelStep);
      const sr = clamp01(r / 255);
      const sg = clamp01(g / 255);
      const sb = clamp01(b / 255);
      const index = (y * width + x) * 4;
      buffer[index] = Math.round(sr * 255);
      buffer[index + 1] = Math.round(sg * 255);
      buffer[index + 2] = Math.round(sb * 255);
      buffer[index + 3] = 255;
    }
  }
  return buffer;
}

async function bakeQuality(quality: Quality): Promise<Array<{ file: string; size: number; width: number; height: number }>> {
  const config = TERRAIN_TEXTURE_CONFIG.levels[quality];
  const files: Array<{ file: string; size: number; width: number; height: number }> = [];
  const startedAt = performance.now();
  const tasks = [
    {
      name: `terrain-basecolor-${quality}.webp`,
      width: config.baseColorSize,
      height: config.baseColorSize,
      type: 'webp' as const,
      sampler: (nx: number, nz: number) => baseColor(nx, nz, sampleAt(nx, nz)),
    },
    {
      name: `terrain-normal-${quality}.png`,
      width: config.normalSize,
      height: config.normalSize,
      type: 'png' as const,
      sampler: (nx: number, nz: number, pixelStep: number) => normalAt(nx, nz, pixelStep),
    },
    {
      name: `terrain-orm-${quality}.png`,
      width: config.ormSize,
      height: config.ormSize,
      type: 'png' as const,
      sampler: (nx: number, nz: number) => ormAt(nx, nz, sampleAt(nx, nz)),
    },
    {
      name: `terrain-emissive-${quality}.webp`,
      width: config.emissiveSize,
      height: config.emissiveSize,
      type: 'webp' as const,
      sampler: (nx: number, nz: number) => emissiveAt(nx, nz),
    },
  ];

  for (const task of tasks) {
    const buffer = createBuffer(task.width, task.height, task.sampler);
    const file = resolve(OUT_DIR, task.name);
    const size = await writeImage(buffer, task.width, task.height, file, task.type);
    files.push({ file: task.name, size, width: task.width, height: task.height });
  }

  console.info(`[terrain-materials] ${quality} baked in ${(performance.now() - startedAt).toFixed(1)}ms`);
  return files;
}

async function generate(): Promise<void> {
  const startedAt = performance.now();
  await mkdir(OUT_DIR, { recursive: true });
  const allFiles: Array<{ file: string; size: number; width: number; height: number }> = [];
  for (const quality of ['high', 'medium', 'low'] as Quality[]) {
    allFiles.push(...(await bakeQuality(quality)));
  }

  await sharp(resolve(OUT_DIR, 'terrain-normal-high.png')).resize(1024, 1024).png({ compressionLevel: 8 }).toFile(resolve(OUT_DIR, 'terrain-normal-preview-high.png'));
  const previewSize = (await stat(resolve(OUT_DIR, 'terrain-normal-preview-high.png'))).size;
  allFiles.push({ file: 'terrain-normal-preview-high.png', size: previewSize, width: 1024, height: 1024 });
  const previewTasks = [
    ['terrain-basecolor-high.webp', 'terrain-basecolor-preview.png'],
    ['terrain-orm-high.png', 'terrain-ao-preview.png', 0],
    ['terrain-orm-high.png', 'terrain-roughness-preview.png', 1],
  ] as const;
  for (const task of previewTasks) {
    const source = sharp(resolve(OUT_DIR, task[0])).resize(1024, 1024);
    const output = resolve(OUT_DIR, task[1]);
    if (task.length === 3) {
      await source.extractChannel(task[2]).toColourspace('b-w').png({ compressionLevel: 8 }).toFile(output);
    } else {
      await source.png({ compressionLevel: 8 }).toFile(output);
    }
    const size = (await stat(output)).size;
    allFiles.push({ file: task[1], size, width: 1024, height: 1024 });
  }
  bakeStats.baseDarkPixelRatio = basePixelCount > 0 ? baseDarkPixels / basePixelCount : 0;

  await writeFile(
    resolve(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), elapsedMs: performance.now() - startedAt, stats: bakeStats, files: allFiles }, null, 2)}\n`,
    'utf8',
  );

  console.info('[terrain-materials] complete', {
    elapsedMs: (performance.now() - startedAt).toFixed(1),
    files: allFiles.map((item) => ({ ...item, sizeKb: Math.round(item.size / 1024) })),
  });
}

await generate();
