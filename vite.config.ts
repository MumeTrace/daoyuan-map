import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

function stripThreeWindowMarker(): Plugin {
  return {
    name: 'strip-three-window-marker',
    generateBundle(_, bundle) {
      const markerBlock =
        /if \(typeof window !== "undefined"\) \{\s+if \(window\.__THREE__\) \{\s+console\.warn\("WARNING: Multiple instances of Three\.js being imported\."\);\s+\} else \{\s+window\.__THREE__ = REVISION;\s+\}\s+\}/;

      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          item.code = item.code.replace(markerBlock, '');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [stripThreeWindowMarker()],
  build: {
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        entryFileNames: 'xuantian-map.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
