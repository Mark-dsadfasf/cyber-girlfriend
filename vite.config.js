import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/audio': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})