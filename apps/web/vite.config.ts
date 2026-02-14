import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@rangeclick/types': path.resolve(__dirname, '../../packages/types/src/index.ts')
    }
  },
  server: {
    port: 1600
  }
})
