import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: { '/sb': { target: env.VITE_SUPABASE_URL, changeOrigin: true, rewrite: (p) => p.replace(/^\/sb/, '') } },
  },
  }
})
