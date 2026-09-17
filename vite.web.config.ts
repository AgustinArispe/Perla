import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { developmentCsp } from './scripts/vite-development-csp';

export default defineConfig({
  root: 'src/renderer',
  plugins: [react(), developmentCsp()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: { usePolling: process.env.BOCHA_USE_POLLING === '1' },
  },
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
