import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    define: {},
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Default backend port 3080 — Vite runs on 3000, so proxy must NOT point at 3000 (loops / hangs).
      proxy: {
        '/api': { target: env.VITE_API_URL || 'http://localhost:3080', changeOrigin: true },
        '/socket.io': { target: env.VITE_API_URL || 'http://localhost:3080', ws: true },
      },
    },
  };
});
