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
    proxy: {
      '^/api/': {
        target: process.env.BOCHA_API_URL ?? 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
    watch: { usePolling: process.env.BOCHA_USE_POLLING === '1' },
  },
  build: { outDir: '../../dist/web', emptyOutDir: true, assetsInlineLimit: 0 },
});
