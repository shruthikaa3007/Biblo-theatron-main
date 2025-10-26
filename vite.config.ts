import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load .env file variables
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // No proxy needed for Firebase setup
      },
      plugins: [react()],
      define: {
        // Define GEMINI_API_KEY for geminiService.ts
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // FIX: Removed resolve.alias section as it might conflict
      // with relative paths in some build environments.
      // resolve: {
      //   alias: {
      //     '@': path.resolve(__dirname, '.'),
      //   }
      // }
    };
});

