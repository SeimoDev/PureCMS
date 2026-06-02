import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cmsManualChunk } from './src/buildChunks'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: cmsManualChunk,
      },
    },
  },
  server: {
    port: 5173,
  },
})
