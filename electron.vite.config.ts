import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { developmentCsp } from './scripts/vite-development-csp';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          bootstrap: resolve('src/main/bootstrap.ts'),
          'database-worker': resolve('src/worker/index.ts'),
        },
        output: { entryFileNames: '[name].js' },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: resolve('src/main/preload.ts') } },
  },
  renderer: {
    root: 'src/renderer',
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
    plugins: [react(), developmentCsp()],
    build: { minify: true, rollupOptions: { input: resolve('src/renderer/index.html') } },
  },
});
