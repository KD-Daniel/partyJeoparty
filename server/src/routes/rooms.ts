import { Router, Request, Response } from 'express'
import pool, { isConnected } from '../db/index.js'
import { GameSetup, GameSession } from '../types/index.js'
import { gameSessions } from '../socket/handlers.js'
import { RowDataPacket } from 'mysql2'
import { getInMemoryDeck } from './decks.js'

const router = Router()

// Generate a unique room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing characters
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create a new game room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { setupId, setup, hostId } = req.body as {
      setupId?: string
      setup?: GameSetup
      hostId: string
    }

    if (!hostId) {
      res.status(400).json({ error: 'Host ID is required' })
      return
    }

    let gameSetup: GameSetup

    // If setupId is provided, fetch from database or in-memory storage
    if (setupId) {
      if (isConnected()) {
        const [rows] = await pool.query<RowDataPacket[]>(
          'SELECT * FROM decks WHERE id = ?',
          [setupId]
        )

        if (rows.length === 0) {
          res.status(404).json({ error: 'Deck not found' })
          return
        }

        gameSetup = JSON.parse(rows[0].setup_json)
      } else {
        // Try in-memory storage
        const inMemoryDeck = getInMemoryDeck(setupId)
        if (!inMemoryDeck) {
          res.status(404).json({ error: 'Deck not found' })
          return
        }
        gameSetup = inMemoryDeck.setup
      }
    } else if (setup) {
      // Use provided setup directly (no database needed)
      gameSetup = setup
    } else {
      res.status(400).json({ error: 'Either setupId or setup is required' })
      return
    }

    // Generate unique room code
    let roomCode = generateRoomCode()
    while (gameSessions.has(roomCode)) {
      roomCode = generateRoomCode()
    }

    // Initialize game session
    const session: GameSession = {
      code: roomCode,
      setupId,
      setup: gameSetup,
      status: 'lobby',
      scores: new Map(),
      usedClues: new Set(),
      currentRoundIndex: 0,
      hostId,
      players: new Map(),
      stats: new Map(),
    }

    // Initialize scores for all players
    gameSetup.players.forEach((player) => {
      session.scores.set(player.id, 0)
      session.stats.set(player.id, {
        correct: 0,
        incorrect: 0,
        buzzWins: 0,
        totalBuzzTime: 0,
      })
    })

    // Store session in memory
    gameSessions.set(roomCode, session)

    res.status(201).json({
      roomCode,
      hostId,
      status: 'lobby',
    })
  } catch (error) {
    console.error('Error creating room:', error)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

// Get room details
router.get('/:code', (req: Request, res: Response) => {
  const { code } = req.params

  const session = gameSessions.get(code)
  if (!session) {
    res.status(404).json({ error: 'Room not found' })
    return
  }

  res.json({
    code: session.code,
    status: session.status,
    hostId: session.hostId,
    players: Array.from(session.players.values()),
    scores: Object.fromEntries(session.scores),
    currentRoundIndex: session.currentRoundIndex,
    currentSelector: session.currentSelector,
    usedClues: Array.from(session.usedClues),
    setup: session.setup, // Return full setup including categories
  })
})

// Start the game
router.post('/:code/start', (req: Request, res: Response) => {
  const { code } = req.params
  const { hostId } = req.body

  const session = gameSessions.get(code)
  if (!session) {
    res.status(404).json({ error: 'Room not found' })
    return
  }

  if (session.hostId !== hostId) {
    res.status(403).json({ error: 'Only the host can start the game' })
    return
  }

  if (session.status !== 'lobby') {
    res.status(400).json({ error: 'Game has already started' })
    return
  }

  // Check if all players are ready
  const allReady = Array.from(session.players.values()).every((p) => p.ready)
  if (!allReady && session.players.size > 0) {
    res.status(400).json({ error: 'Not all players are ready' })
    return
  }

  session.status = 'in_round'
  session.currentRoundIndex = 0

  // Set first player as selector (use first player from setup)
  if (session.setup.players.length > 0) {
    session.currentSelector = session.setup.players[0].id
  }

  res.json({
    status: 'started',
    currentRoundIndex: session.currentRoundIndex,
  })
})

// End the game
router.post('/:code/end', (req: Request, res: Response) => {
  const { code } = req.params
  const { hostId } = req.body

  const session = gameSessions.get(code)
  if (!session) {
    res.status(404).json({ error: 'Room not found' })
    return
  }

  if (session.hostId !== hostId) {
    res.status(403).json({ error: 'Only the host can end the game' })
    return
  }

  session.status = 'ended'

  res.json({ status: 'ended' })
})

// Delete a room
router.delete('/:code', (req: Request, res: Response) => {
  const { code } = req.params

  if (!gameSessions.has(code)) {
    res.status(404).json({ error: 'Room not found' })
    return
  }

  gameSessions.delete(code)

  res.status(204).send()
})

export default router
