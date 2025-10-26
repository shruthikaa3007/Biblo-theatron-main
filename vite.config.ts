import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load .env file variables relative to the project root
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // No proxy needed for Firebase setup
      },
      plugins: [react()],
      // No 'define' section needed - Vite handles VITE_ variables automatically
      // via import.meta.env
    };
});

