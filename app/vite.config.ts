import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base: './' is required for Capacitor — assets must use relative paths
  // inside the native WebView. Has no effect on web/Vercel builds.
  base: './',
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
