import { defineConfig } from '@vite-pwa/assets-generator/config'

/**
 * Config for @vite-pwa/assets-generator (T6b) — the plugin's documented
 * companion for generating manifest/apple/favicon PNGs from an SVG source.
 * Regenerate with a one-off `npx --yes @vite-pwa/assets-generator` (reads
 * this file); the generated files already live in `public/` and are
 * committed, so it is intentionally NOT a project devDependency — installing
 * it alongside `vite-plugin-pwa` (whose peerOptional range is
 * `@vite-pwa/assets-generator@^1.0.0`) conflicts with the current v2 release
 * and, worse, an `--legacy-peer-deps` install to force it silently drops
 * required peers elsewhere (observed: @testing-library/dom).
 */
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    transparent: {
      sizes: [192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    maskable: {
      sizes: [512],
    },
    apple: {
      sizes: [180],
    },
    assetName: (type, size) => {
      if (type === 'apple') return 'apple-touch-icon.png'
      if (type === 'maskable') return `maskable-icon-${size.width}x${size.height}.png`
      return `pwa-${size.width}x${size.height}.png`
    },
  },
  images: ['public/icon.svg'],
})
