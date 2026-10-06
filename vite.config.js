import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the admin dashboard.
//
// The dev server proxies /api and /socket.io to the Express backend, so
// the browser only ever talks to one origin — no CORS handling locally,
// and axios can use relative URLs (which also works in production when
// the dashboard is served from the same domain as the API).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
