import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        proxy: {
            // Cloudflare Workers 開発サーバー（wrangler dev）で提供される
            // /api/boundary エンドポイントへプロキシする
            '/api/boundary': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true,
            },
        },
    },
})
