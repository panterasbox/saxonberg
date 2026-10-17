import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Multi-page: each overlay is its own entry so OBS points a Browser Source at
// a dedicated, unauthenticated page (e.g. http://localhost:5200/standby.html).
export default defineConfig({
  plugins: [react()],
  server: { port: 5200 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        standby: resolve(__dirname, 'standby.html'),
      },
    },
  },
});
