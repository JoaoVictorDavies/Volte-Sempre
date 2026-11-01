import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replaceAll('\\', '/')
          if (!modulePath.includes('/node_modules/')) return

          if (
            modulePath.includes('/node_modules/react/')
            || modulePath.includes('/node_modules/react-dom/')
            || modulePath.includes('/node_modules/scheduler/')
            || modulePath.includes('/node_modules/@supabase/')
            || modulePath.includes('/node_modules/react-router-dom/')
            || modulePath.includes('/node_modules/@remix-run/')
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
})