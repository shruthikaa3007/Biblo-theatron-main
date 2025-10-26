import path from 'path';
import { fileURLToPath } from 'url'; // Import necessary functions
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Get the directory name in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy /api requests to our Node server running on port 3001
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        // Define both keys used in the codebase
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Use the explicitly calculated __dirname for the alias
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

