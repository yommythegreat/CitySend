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
        // Path-based (not the object form): with the object form Rollup parked
        // shared React interop helpers inside vendor-stripe, so the entry
        // imported — and preloaded — all of Stripe at launch. Matching by path
        // keeps each vendor chunk to its own package; Stripe and Leaflet now
        // load only with the (lazy) Payment and Tracking screens.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          if (/[\\/]node_modules[\\/]leaflet[\\/]/.test(id))                    return 'vendor-leaflet'
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id))                  return 'vendor-supabase'
          if (/[\\/]node_modules[\\/]@stripe[\\/]/.test(id))                    return 'vendor-stripe'
        },
      },
    },
  },
})
