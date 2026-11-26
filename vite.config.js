import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_PROXY_TARGET || env.BACKEND_URL || 'http://localhost:8001';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      open: false,
      watch: {
        ignored: ['**/backend/**', '**/.pytest_cache/**', '**/uploads/**'],
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/static': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-leaflet': ['leaflet', 'react-leaflet'],
            'vendor-charts': ['recharts'],
          },
        },
      },
    },
  };
});
