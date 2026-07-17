import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outfile = resolve('work/terrain-material-bake.mjs');
await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve('tools/generate-terrain-materials/bake-entry.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  external: ['sharp'],
});

await import(`file://${outfile.replaceAll('\\', '/')}`);
