import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vitaminPlugin from './src/vite-plugin-vitamin/vite'
import { usingVercel } from './src/vite-plugin-vitamin/platform/vercel'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    react(),
    vitaminPlugin({
      target: usingVercel(),
    }),
  ],
})
