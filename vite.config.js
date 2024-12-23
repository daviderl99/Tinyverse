import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Tinyverse/', // Change this to match your GitHub repository name
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
