import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

// Netlify build: the agency studio (/), the client portal (/portal/) and the inquiry form (/inquire/)
export default defineConfig({
  base: '/',
  publicDir: 'netlify-public',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    outDir: 'netlify-dist',
    emptyOutDir: true,
    assetsInlineLimit: 8192,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        portal: path.resolve(import.meta.dirname, 'portal/index.html'),
        inquire: path.resolve(import.meta.dirname, 'inquire/index.html'),
      },
    },
  },
});
