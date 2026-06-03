import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
        changeOrigin: true
      },
      '/audio': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})