import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // NOTE: Do NOT add COOP/COEP headers here — they break the Google OAuth popup.
    // The OAuth popup uses window.opener to communicate back, which COOP blocks.
  },
  optimizeDeps: {
    include: ['react-pdf'],
  },
});
