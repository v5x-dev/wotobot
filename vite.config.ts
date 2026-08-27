import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Cloudflare quick tunnels get a new random subdomain on every run.
    allowedHosts: ['.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
})
