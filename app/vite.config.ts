import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise the warning threshold (leaflet alone is ~150 kB gzip)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-leaflet':  ['leaflet'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-stripe':   ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
  },
})
