import { createServer } from 'http'
import { readFile, existsSync } from 'fs'
import { resolve, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = 3000

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.mtn': 'application/octet-stream',
  '.moc': 'application/octet-stream',
  '.exp.json': 'application/json',
  '.physics.json': 'application/json',
  '.pose.json': 'application/json',
  '.model.json': 'application/json',
}

const server = createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0])
  if (urlPath === '/') urlPath = '/index.html'

  // Try .js first, then try as-is
  let filePath = resolve(__dirname, '.' + urlPath)
  
  // Handle /models/... path -> public/models/...
  if (urlPath.startsWith('/models/')) {
    filePath = resolve(__dirname, 'public' + urlPath)
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`404: ${urlPath}`)
    console.log(`404 ${urlPath}`)
    return
  }

  const ext = extname(filePath).toLowerCase()
  const mime = mimeTypes[ext] || 'application/octet-stream'

  readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500)
      res.end('500 Internal Server Error')
      return
    }
    res.writeHead(200, { 'Content-Type': mime })
    res.end(data)
    console.log(`200 ${urlPath}`)
  })
})

server.listen(PORT, () => {
  console.log(`静态服务器已启动: http://localhost:${PORT}`)
  console.log('按 Ctrl+C 停止')
})
