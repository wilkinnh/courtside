import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

// Independent browser build: no Sites, Workers, RSC, or hosting credentials.
export default defineConfig({
  root: fileURLToPath(new URL('./local', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [react()],
  resolve: {alias: {'@': fileURLToPath(new URL('.', import.meta.url))}},
  server: {proxy: {'/api': 'http://127.0.0.1:8788'}},
  build: {outDir: '../dist-local', emptyOutDir: true},
});
