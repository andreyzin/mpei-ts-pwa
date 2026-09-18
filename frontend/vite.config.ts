import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Расписание МЭИ',
          short_name: 'Расписание',
          description: 'Расписание занятий МЭИ',
          theme_color: '#3d78b8',
          background_color: '#eef5fa',
          display: 'standalone',
          lang: 'ru',
          icons: [
            { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /\/api\/v1\/.*\/schedule/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'schedule-api',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 14 },
                networkTimeoutSeconds: 5,
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
