import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const wpUrl = (env.VITE_WP_URL || '').trim().replace(/\/+$/, '');

  return {
    // Set VITE_BASE_PATH=/store/ if you deploy into a sub-folder.
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: 5173,
      // In development all /wp-json calls are proxied to your WordPress site,
      // so you never hit CORS problems while building.
      proxy: wpUrl
        ? { '/wp-json': { target: wpUrl, changeOrigin: true, secure: true } }
        : undefined,
    },
  };
});
