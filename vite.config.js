// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  // optimizeDeps removed unless you need it for other reasons
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      // external: ['@screenpipe/js'] REMOVED
      input: {
        popup: path.resolve(__dirname, 'popup.html')
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
    emptyOutDir: true
  }
});