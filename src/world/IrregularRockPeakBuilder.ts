import * as THREE from 'three';

type PeakOptions = {
  height: number;
  radius: number;
  rings: number;
  segments: number;
  color: number;
  topColor?: number;
  seed: number;
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

/** 创建底部宽、顶部窄、带扰动和偏移的不规则岩峰网格。 */
export class IrregularRockPeakBuilder {
  buildPeak(options: PeakOptions): THREE.Mesh {
    const random = createSeededRandom(options.seed);
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const baseColor = new THREE.Color(options.color);
    const topColor = new THREE.Color(options.topColor ?? options.color);

    for (let ring = 0; ring <= options.rings; ring += 1) {
      const t = ring / options.rings;
      const y = t * options.height;
      const taper = Math.pow(1 - t, 1.35);
      const ringRadius = options.radius * (0.18 + taper * 0.92);
      const centerX = (random() - 0.5) * options.radius * t * 0.45;
      const centerZ = (random() - 0.5) * options.radius * t * 0.45;

      for (let segment = 0; segment < options.segments; segment += 1) {
        const angle = (segment / options.segments) * Math.PI * 2;
        const radialNoise = 0.82 + random() * 0.34;
        vertices.push(
          centerX + Math.cos(angle) * ringRadius * radialNoise,
          y,
          centerZ + Math.sin(angle) * ringRadius * radialNoise,
        );
        const color = baseColor.clone().lerp(topColor, t);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let ring = 0; ring < options.rings; ring += 1) {
      for (let segment = 0; segment < options.segments; segment += 1) {
        const nextSegment = (segment + 1) % options.segments;
        const a = ring * options.segments + segment;
        const b = ring * options.segments + nextSegment;
        const c = (ring + 1) * options.segments + segment;
        const d = (ring + 1) * options.segments + nextSegment;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.03,
      flatShading: false,
    });
    return new THREE.Mesh(geometry, material);
  }
}
