import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';
import { CSP } from './src/main/security';

// The dev server needs eval and websockets, so the strict policy applies to builds only.
const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: { input: { index: 'src/main/index.ts', mcp: 'src/mcp/index.ts' } },
    },
  },
  preload: { build: { outDir: 'out/preload' } },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), cspMeta()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: { input: { index: 'src/renderer/index.html', e2e: 'src/renderer/e2e.html' } },
    },
    worker: { format: 'es' },
  },
});
