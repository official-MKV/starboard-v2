// server.js - Custom server for Next.js + WebSocket (Fixed paths)
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { setupWebSocketServer } = require('./src/lib/websocket')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Initialize Next.js
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

console.log('🚀 Starting custom server with WebSocket support...')

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Setup WebSocket server on the same port
  console.log('🔌 Setting up WebSocket server...')
  const wss = setupWebSocketServer(server)

  // Make WebSocket server globally available for API routes
  // ✅ FIXED: Use consistent src/lib/websocket path
  global.wss = wss
  global.broadcastToUser = require('./src/lib/websocket').broadcastToUser
  global.broadcastToUsers = require('./src/lib/websocket').broadcastToUsers

  // Start the server
  server.listen(port, err => {
    if (err) throw err
    console.log(`✅ Next.js ready on http://${hostname}:${port}`)
    console.log(`✅ WebSocket ready on ws://${hostname}:${port}/api/chat/ws`)
    console.log(`🎉 Full-stack chat server running!`)
    console.log('')
    console.log('📋 Available features:')
    console.log('  ✅ Real-time messaging')
    console.log('  ✅ Typing indicators')
    console.log('  ✅ Online/offline status')
    console.log('  ✅ Message broadcasting')
    console.log('')
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully')
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully')
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })
})
