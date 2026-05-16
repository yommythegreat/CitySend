import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      // Ensure shared/ files resolve @supabase/supabase-js from this app's
      // node_modules (shared/ has no node_modules of its own on Vercel)
      '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
    },
  },
})
