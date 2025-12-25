import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import pool, { isConnected } from '../db/index.js'
import { GameSetup } from '../types/index.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

const router = Router()

// In-memory storage fallback when database is unavailable
interface InMemoryDeck {
  id: string
  title: string
  setup: GameSetup
  created_at: Date
  updated_at: Date
}

const inMemoryDecks: Map<string, InMemoryDeck> = new Map()

// Export helper for rooms to access in-memory decks
export function getInMemoryDeck(id: string): InMemoryDeck | undefined {
  return inMemoryDecks.get(id)
}

// Create a new deck
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, setup } = req.body as { title: string; setup: GameSetup }

    if (!title || !setup) {
      res.status(400).json({ error: 'Title and setup are required' })
      return
    }

    const id = uuidv4()
    const now = new Date()

    // Check if database is connected
    if (isConnected()) {
      const setupJson = JSON.stringify(setup)
      await pool.query(
        'INSERT INTO decks (id, title, setup_json) VALUES (?, ?, ?)',
        [id, title, setupJson]
      )
    } else {
      // Use in-memory storage
      inMemoryDecks.set(id, { id, title, setup, created_at: now, updated_at: now })
    }

    res.status(201).json({
      id,
      title,
      setup,
      created_at: now,
      updated_at: now,
    })
  } catch (error) {
    console.error('Error creating deck:', error)
    res.status(500).json({ error: 'Failed to create deck' })
  }
})

// Get all decks
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (isConnected()) {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, title, created_at, updated_at FROM decks ORDER BY updated_at DESC'
      )
      res.json(rows)
    } else {
      // Return in-memory decks
      const decks = Array.from(inMemoryDecks.values()).map(d => ({
        id: d.id,
        title: d.title,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })).sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
      res.json(decks)
    }
  } catch (error) {
    console.error('Error fetching decks:', error)
    res.status(500).json({ error: 'Failed to fetch decks' })
  }
})

// Get a single deck by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (isConnected()) {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM decks WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }

      const deck = rows[0]
      res.json({
        id: deck.id,
        title: deck.title,
        setup: JSON.parse(deck.setup_json),
        created_at: deck.created_at,
        updated_at: deck.updated_at,
      })
    } else {
      const deck = inMemoryDecks.get(id)
      if (!deck) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }
      res.json(deck)
    }
  } catch (error) {
    console.error('Error fetching deck:', error)
    res.status(500).json({ error: 'Failed to fetch deck' })
  }
})

// Update a deck
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, setup } = req.body as { title?: string; setup?: GameSetup }

    if (isConnected()) {
      // Check if deck exists
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM decks WHERE id = ?',
        [id]
      )

      if (existing.length === 0) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }

      const updates: string[] = []
      const values: any[] = []

      if (title) {
        updates.push('title = ?')
        values.push(title)
      }

      if (setup) {
        updates.push('setup_json = ?')
        values.push(JSON.stringify(setup))
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No updates provided' })
        return
      }

      values.push(id)

      await pool.query(
        `UPDATE decks SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      // Fetch updated deck
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM decks WHERE id = ?',
        [id]
      )

      const deck = rows[0]
      res.json({
        id: deck.id,
        title: deck.title,
        setup: JSON.parse(deck.setup_json),
        created_at: deck.created_at,
        updated_at: deck.updated_at,
      })
    } else {
      const deck = inMemoryDecks.get(id)
      if (!deck) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }

      if (title) deck.title = title
      if (setup) deck.setup = setup
      deck.updated_at = new Date()

      res.json(deck)
    }
  } catch (error) {
    console.error('Error updating deck:', error)
    res.status(500).json({ error: 'Failed to update deck' })
  }
})

// Delete a deck
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (isConnected()) {
      const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM decks WHERE id = ?',
        [id]
      )

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }
    } else {
      if (!inMemoryDecks.has(id)) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }
      inMemoryDecks.delete(id)
    }

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting deck:', error)
    res.status(500).json({ error: 'Failed to delete deck' })
  }
})

// Duplicate a deck
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title } = req.body as { title?: string }

    if (isConnected()) {
      // Get original deck
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM decks WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }

      const originalDeck = rows[0]
      const newId = uuidv4()
      const newTitle = title || `${originalDeck.title} (Copy)`

      await pool.query(
        'INSERT INTO decks (id, title, setup_json) VALUES (?, ?, ?)',
        [newId, newTitle, originalDeck.setup_json]
      )

      res.status(201).json({
        id: newId,
        title: newTitle,
        setup: JSON.parse(originalDeck.setup_json),
        created_at: new Date(),
        updated_at: new Date(),
      })
    } else {
      const originalDeck = inMemoryDecks.get(id)
      if (!originalDeck) {
        res.status(404).json({ error: 'Deck not found' })
        return
      }

      const newId = uuidv4()
      const newTitle = title || `${originalDeck.title} (Copy)`
      const now = new Date()
      const newDeck = {
        id: newId,
        title: newTitle,
        setup: { ...originalDeck.setup },
        created_at: now,
        updated_at: now,
      }

      inMemoryDecks.set(newId, newDeck)
      res.status(201).json(newDeck)
    }
  } catch (error) {
    console.error('Error duplicating deck:', error)
    res.status(500).json({ error: 'Failed to duplicate deck' })
  }
})

export default router
