import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const cesium = 'node_modules/cesium/Build/Cesium'

export default defineConfig({
  plugins: [
    react(),
    // CesiumJS loads its workers and assets at runtime from CESIUM_BASE_URL.
    viteStaticCopy({
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((d) => ({
        src: `${cesium}/${d}/**/*`, dest: 'cesium', rename: { stripBase: 4 },
      })),
    }),
  ],
  base: './',
  build: { chunkSizeWarningLimit: 6000 },
})
