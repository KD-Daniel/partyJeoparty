import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './db/index.js'
import decksRouter from './routes/decks.js'
import roomsRouter from './routes/rooms.js'
import { setupSocketHandlers } from './socket/handlers.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for local network play
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/decks', decksRouter)
app.use('/api/rooms', roomsRouter)

// Set up Socket.IO handlers
setupSocketHandlers(io)

// Start server and test database connection
async function startServer() {
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.warn('Database connection failed, but server will continue running')
  }

  const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`)
    console.log(`For local network access, use your IP address with port ${port}`)
  })
}

startServer()
