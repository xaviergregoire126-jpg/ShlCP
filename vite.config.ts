import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), viteSingleFile()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      strictPort: true,
      allowedHosts: true,
      hmr: true,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  };
});
