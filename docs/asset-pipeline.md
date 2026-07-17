# Xuantian Map Asset Pipeline

## Directory Layout

- `public/models/landmarks/`: sects, palaces, gates, floating islands, and other large landmark GLB files.
- `public/models/nature/`: future reusable natural GLB assets.
- `public/models/shared/`: shared props that can be reused by multiple landmark models.
- `public/models/decoders/`: optional Draco and Basis/KTX2 decoder files.
- `public/textures/landmarks/`: optional external landmark texture files.
- `blender/common/`: shared Blender Python helpers.
- `blender/landmarks/`: future landmark generation scripts.
- `blender/nature/`: future natural asset generation scripts.
- `blender/output/`: local exported models before copying to `public/`.

## Naming

Runtime code must use stable English IDs and ASCII filenames only.

Examples:

- `central_palace.glb`
- `floating_island_a.glb`
- `xingdao_observatory.glb`
- `kunlun_gate.glb`
- `hehuan_palace.glb`
- `shushan_gate.glb`
- `buddhist_pagoda.glb`
- `demonic_temple.glb`
- `blood_tower.glb`

Chinese display names stay in `src/data/regions.ts`; filenames never depend on Chinese text.

## Blender Export Contract

- Y axis is up.
- The building front direction is consistent across assets.
- Origin is at the bottom center of the model.
- Location, rotation, and scale are applied before export.
- No hidden cameras, lights, or unused objects should be exported.
- Units are world-map units.
- The bottom of the model should not contain large empty space.

## Runtime Registration

Every runtime model is registered in `src/assets/modelRegistry.ts`.

The registry stores:

- model ID
- relative URL
- fallback type
- default scale
- optional LOD URLs
- shadow policy
- expected bounds

All URLs are resolved through `src/assets/AssetUrlResolver.ts`.

## Test Asset

`blender/tests/generate_test_landmark.py` writes a small legal GLB to:

`public/models/landmarks/test_landmark.glb`

It is intentionally simple and exists only to verify:

- URL resolution
- GLTFLoader parsing
- AssetManager cache
- placement through TerrainSampler
- external-model replacement
- fallback behavior for missing models
