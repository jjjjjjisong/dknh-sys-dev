import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Use relative asset paths so the built app can be deployed from either
  // the domain root or a subdirectory without rewriting asset URLs.
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
}));
