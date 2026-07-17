# Terrain Material Pipeline

Phase 1.8 uses stable native Three.js PBR material slots only:

- `MeshStandardMaterial.vertexColors`
- `map`
- `normalMap`
- `roughnessMap`
- `aoMap`
- `emissiveMap`

It does not use `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile`, custom GLSL, or displacement.

## Generate

Run:

```bash
npm run generate:terrain-materials
```

The generator writes deterministic files to:

```text
public/textures/terrain/generated/
```

## Output

- `terrain-basecolor-*.webp`: sRGB color, full-map UV aligned.
- `terrain-normal-*.png`: linear tangent-space normal detail.
- `terrain-orm-*.png`: linear ORM texture. R = AO, G = roughness, B = 0.
- `terrain-emissive-*.webp`: sRGB glow map, black except main volcano crater and lava channels.

## Runtime

`TextureManager` resolves URLs through `resolveAssetUrl()`, then applies loaded textures to the stable terrain material. If one texture fails, only that slot is skipped. If all textures fail, terrain remains visible through vertex colors.

For remote Tavern usage, host `xuantian-map.js` together with the `textures/terrain/generated/` directory, or set `ASSET_CONFIG.assetBaseUrl`.
