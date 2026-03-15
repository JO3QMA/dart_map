/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    proxy: {
      // Cloudflare Workers 開発サーバー（wrangler dev）で提供される
      '/api/boundary': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/regions': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/draw': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
