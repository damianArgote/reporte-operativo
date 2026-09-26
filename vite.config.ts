import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': see src/pwa/registerSW.ts doc comment —
      // an operator may have an unsaved add-entry draft open when a new
      // version lands, and autoUpdate would reload without asking.
      registerType: 'prompt',
      // No includeAssets: workbox's globPatterns below already precaches
      // every ico/png/svg under public/ (adding them here too would just
      // duplicate the precache manifest entries).
      manifest: {
        name: 'Registro diario',
        short_name: 'Registro',
        description: 'Registro diario de novedades de la playa, con reporte listo para copiar a WhatsApp.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#171717',
        categories: ['productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache every built asset (fonts included) plus the app shell;
        // no runtime caching, since the app makes no network requests.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // vite-plugin-pwa only provides the real `virtual:pwa-register` module
      // at build/dev time; under Vitest, alias it to a no-op stand-in so
      // src/pwa/registerSW.ts never needs the plugin's generated SW.
      ...(process.env.VITEST ? { 'virtual:pwa-register': path.resolve(import.meta.dirname, './src/pwa/registerSW.mock.ts') } : {}),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // Pin the test-runner timezone so local-date logic (utils/dates) is
    // deterministic regardless of the machine running the tests.
    env: {
      TZ: 'America/Argentina/Buenos_Aires',
    },
  },
})
