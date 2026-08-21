import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const protobotModels = path.resolve(
  rootDir,
  '../../contrib/Protobot-Rebuilt/Assets/Models',
)

function serveProtobotModels(): Plugin {
  return {
    name: 'protobot-models',
    configureServer(server) {
      server.middlewares.use('/protobot-models', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '/').split('?')[0])
        const file = path.resolve(protobotModels, `.${rel}`)
        if (!file.startsWith(protobotModels)) {
          next()
          return
        }
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      const dest = path.resolve(rootDir, 'dist/protobot-models')
      if (fs.existsSync(protobotModels)) {
        fs.cpSync(protobotModels, dest, { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveProtobotModels()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    fs: {
      allow: [rootDir, protobotModels],
    },
  },
})
