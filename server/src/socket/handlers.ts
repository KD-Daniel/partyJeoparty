import { Server, Socket } from 'socket.io'
import { GameSession } from '../types/index.js'

// In-memory storage for game sessions
export const gameSessions = new Map<string, GameSession>()

// Helper function to handle answer timeout
function handleAnswerTimeout(io: Server, roomCode: string, playerId: string) {
  const session = gameSessions.get(roomCode)
  if (!session || !session.currentClue) return

  // Clear answer state
  if (session.answerState?.timeoutId) {
    clearTimeout(session.answerState.timeoutId)
  }
  session.answerState = undefined

  // Treat as incorrect answer
  const clueValue = session.currentClue.clue.value
  const currentScore = session.scores.get(playerId) || 0
  session.scores.set(playerId, currentScore - clueValue)

  // Update stats
  const stats = session.stats.get(playerId)
  if (stats) {
    stats.incorrect++
  }

  io.to(roomCode).emit('answer-timeout', {
    playerId,
    correctAnswer: session.currentClue.clue.acceptableAnswers[0],
  })

  // Handle rebound or move to next selector
  handleIncorrectAnswer(io, session, roomCode, playerId)
}

// Helper function to handle incorrect answer (rebound or next)
function handleIncorrectAnswer(
  io: Server,
  session: GameSession,
  roomCode: string,
  playerId: string
) {
  if (!session.buzzState || !session.currentClue) return

  // If rebound is enabled, allow other players to buzz
  if (session.setup.rules.reboundEnabled) {
    session.buzzState.excludedPlayers.push(playerId)

    // Check if there are still players who can buzz
    const remainingPlayers = Array.from(session.players.keys()).filter(
      (id) => !session.buzzState!.excludedPlayers.includes(id)
    )

    if (remainingPlayers.length > 0) {
      // Re-enable buzzing for remaining players
      session.buzzState.enabled = true
      session.buzzState.winner = undefined

      io.to(roomCode).emit('buzz-enabled', {
        timestamp: Date.now(),
        excludedPlayers: session.buzzState.excludedPlayers,
      })
      return
    }
  }

  // No rebound or no remaining players - reveal answer and move to next
  revealAnswerAndContinue(io, session, roomCode)
}

// Helper function to reveal answer and continue to next clue
function revealAnswerAndContinue(
  io: Server,
  session: GameSession,
  roomCode: string
) {
  if (!session.currentClue) return

  const correctAnswer = session.currentClue.clue.acceptableAnswers[0]

  io.to(roomCode).emit('answer-revealed', {
    correctAnswer,
    scores: Object.fromEntries(session.scores),
  })

  // Clear buzz state
  session.buzzState = undefined

  // Clear current clue
  session.currentClue = undefined

  // Check if round is complete
  const currentRound = session.setup.rounds[session.currentRoundIndex]
  const totalClues = currentRound.categories.reduce(
    (sum, cat) => sum + cat.clues.length,
    0
  )

  if (session.usedClues.size >= totalClues) {
    // Round complete - check for next round
    if (session.currentRoundIndex < session.setup.rounds.length - 1) {
      // Transition to next round
      session.currentRoundIndex++
      const nextRound = session.setup.rounds[session.currentRoundIndex]

      io.to(roomCode).emit('round-transition', {
        completedRound: currentRound.name,
        nextRound: nextRound.name,
        nextRoundIndex: session.currentRoundIndex,
        round: nextRound,
        scores: Object.fromEntries(session.scores),
      })
    } else {
      // All rounds complete - end game
      session.status = 'ended'
      io.to(roomCode).emit('game-ended', {
        finalScores: Object.fromEntries(session.scores),
        stats: Object.fromEntries(session.stats),
      })
    }
  } else {
    // Emit ready for next clue
    io.to(roomCode).emit('ready-for-next-clue', {
      currentSelector: session.currentSelector,
    })
  }
}

// Helper function to normalize answer for comparison
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

// Helper function to validate answer
function validateAnswer(
  userAnswer: string,
  acceptableAnswers: string[]
): boolean {
  const normalized = normalizeAnswer(userAnswer)
  return acceptableAnswers.some(
    (acceptable) => normalizeAnswer(acceptable) === normalized
  )
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Simple socket room join (for receiving broadcasts without being a player)
    socket.on('join-socket-room', ({ roomCode }) => {
      socket.join(roomCode)
      socket.data.roomCode = roomCode
      console.log(`Socket ${socket.id} joined room ${roomCode} for broadcasts`)
    })

    // Join a room
    socket.on('join-room', ({ roomCode, playerName, playerId }) => {
      console.log(`Player ${playerName} (${playerId}) joining room ${roomCode}`)

      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Add player to session
      session.players.set(playerId, {
        id: playerId,
        name: playerName,
        socketId: socket.id,
        ready: false,
      })

      // Join the socket room
      socket.join(roomCode)

      // Store room code on socket for cleanup
      socket.data.roomCode = roomCode
      socket.data.playerId = playerId

      // Broadcast to all players in room
      io.to(roomCode).emit('player-joined', {
        playerId,
        playerName,
        players: Array.from(session.players.values()),
      })

      // Send current game state to the joining player
      socket.emit('game-state', {
        session: {
          code: session.code,
          status: session.status,
          scores: Object.fromEntries(session.scores),
          usedClues: Array.from(session.usedClues),
          currentRoundIndex: session.currentRoundIndex,
          currentSelector: session.currentSelector,
          players: Array.from(session.players.values()),
        },
      })
    })

    // Toggle ready state
    socket.on('toggle-ready', () => {
      const { roomCode, playerId } = socket.data

      if (!roomCode || !playerId) {
        socket.emit('error', { message: 'Not in a room' })
        return
      }

      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const player = session.players.get(playerId)
      if (player) {
        player.ready = !player.ready

        io.to(roomCode).emit('player-ready-changed', {
          playerId,
          ready: player.ready,
          players: Array.from(session.players.values()),
        })
      }
    })

    // Start game
    socket.on('start-game', ({ roomCode, hostId }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      if (session.hostId !== hostId) {
        socket.emit('error', { message: 'Only the host can start the game' })
        return
      }

      if (session.status !== 'lobby') {
        socket.emit('error', { message: 'Game has already started' })
        return
      }

      session.status = 'in_round'
      session.currentRoundIndex = 0

      // Clear setup player scores and use only connected socket players
      session.scores.clear()
      session.stats.clear()

      const connectedPlayerIds = Array.from(session.players.keys())
      connectedPlayerIds.forEach((playerId) => {
        session.scores.set(playerId, 0)
        session.stats.set(playerId, {
          correct: 0,
          incorrect: 0,
          buzzWins: 0,
          totalBuzzTime: 0,
        })
      })

      // Set first connected player as selector (not setup player)
      if (connectedPlayerIds.length > 0) {
        session.currentSelector = connectedPlayerIds[0]
      }

      io.to(roomCode).emit('game-started', {
        currentRoundIndex: session.currentRoundIndex,
        currentSelector: session.currentSelector,
        round: session.setup.rounds[0],
      })
    })

    // Select a clue
    socket.on('select-clue', ({ roomCode, categoryId, clueId, playerId: eventPlayerId }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Use playerId from event or socket data
      const playerId = eventPlayerId || socket.data.playerId

      // Check if it's this player's turn
      if (session.currentSelector !== playerId) {
        console.log(`Select clue rejected: selector=${session.currentSelector}, playerId=${playerId}`)
        socket.emit('error', { message: 'Not your turn to select' })
        return
      }

      // Check if clue already used
      if (session.usedClues.has(clueId)) {
        socket.emit('error', { message: 'Clue already used' })
        return
      }

      // Find the clue
      const currentRound = session.setup.rounds[session.currentRoundIndex]
      const category = currentRound.categories.find((c) => c.id === categoryId)
      if (!category) {
        socket.emit('error', { message: 'Category not found' })
        return
      }

      const clue = category.clues.find((c) => c.id === clueId)
      if (!clue) {
        socket.emit('error', { message: 'Clue not found' })
        return
      }

      // Mark clue as used
      session.usedClues.add(clueId)

      // Store current clue
      session.currentClue = {
        roundId: currentRound.id,
        categoryId,
        clueId,
        clue,
      }

      // Broadcast clue selected
      io.to(roomCode).emit('clue-selected', {
        categoryId,
        clueId,
        clue: {
          id: clue.id,
          value: clue.value,
          clueText: clue.isDailyDouble ? '' : clue.clueText, // Hide clue text for Daily Double until wager
          isDailyDouble: clue.isDailyDouble,
          media: clue.media,
        },
        usedClues: Array.from(session.usedClues),
        currentSelector: session.currentSelector,
      })

      // Enable buzzing after delay (if not Daily Double)
      if (!clue.isDailyDouble) {
        const delay = session.setup.rules.buzzOpenDelayMs

        setTimeout(() => {
          session.buzzState = {
            enabled: true,
            excludedPlayers: [],
          }

          io.to(roomCode).emit('buzz-enabled', {
            timestamp: Date.now(),
          })
        }, delay)
      } else {
        // For Daily Double, request wager from selector
        const selectorId = session.currentSelector || ''
        io.to(roomCode).emit('daily-double-wager-requested', {
          playerId: selectorId,
          currentScore: session.scores.get(selectorId) || 0,
        })
      }
    })

    // Submit Daily Double wager
    socket.on('submit-daily-double-wager', ({ roomCode, wager }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const { playerId } = socket.data

      if (!session.currentClue || !session.currentClue.clue.isDailyDouble) {
        socket.emit('error', { message: 'No Daily Double active' })
        return
      }

      if (session.currentSelector !== playerId) {
        socket.emit('error', { message: 'Only the selector can wager' })
        return
      }

      // Validate wager (minimum $5, maximum player's score or clue value, whichever is higher)
      const playerScore = session.scores.get(playerId) || 0
      const maxWager = Math.max(playerScore, session.currentClue.clue.value)

      if (wager < 5 || wager > maxWager) {
        socket.emit('error', { message: 'Invalid wager amount' })
        return
      }

      // Store wager in current clue
      session.currentClue.clue.value = wager

      // Now reveal the clue text
      io.to(roomCode).emit('daily-double-clue-revealed', {
        clueText: session.currentClue.clue.clueText,
        wager,
      })

      // Start answer timer for Daily Double
      const answerTimeMs = session.setup.rules.answerTimeSeconds * 1000
      const timeoutId = setTimeout(() => {
        handleAnswerTimeout(io, roomCode, playerId)
      }, answerTimeMs)

      session.answerState = {
        playerId,
        startTime: Date.now(),
        timeoutId,
      }

      io.to(roomCode).emit('answer-timer-started', {
        playerId,
        timeSeconds: session.setup.rules.answerTimeSeconds,
      })
    })

    // Handle buzz
    socket.on('buzz', ({ roomCode }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const { playerId } = socket.data

      // Check if buzzing is enabled
      if (!session.buzzState || !session.buzzState.enabled) {
        socket.emit('error', { message: 'Buzzing not enabled' })
        return
      }

      // Check if player is excluded (already answered incorrectly)
      if (session.buzzState.excludedPlayers.includes(playerId)) {
        socket.emit('error', { message: 'You already answered incorrectly' })
        return
      }

      // Check if there's already a winner
      if (session.buzzState.winner) {
        socket.emit('error', { message: 'Someone already buzzed' })
        return
      }

      // This player wins the buzz
      session.buzzState.winner = playerId
      session.buzzState.enabled = false

      const player = session.players.get(playerId)
      const playerName = player ? player.name : 'Unknown'

      // Track buzz win for stats
      const stats = session.stats.get(playerId)
      if (stats) {
        stats.buzzWins++
      }

      // Broadcast buzz winner
      io.to(roomCode).emit('buzz-winner', {
        playerId,
        playerName,
        timestamp: Date.now(),
      })

      // Start answer timer
      const answerTimeMs = session.setup.rules.answerTimeSeconds * 1000
      const timeoutId = setTimeout(() => {
        // Answer timeout - treat as incorrect
        handleAnswerTimeout(io, roomCode, playerId)
      }, answerTimeMs)

      session.answerState = {
        playerId,
        startTime: Date.now(),
        timeoutId,
      }

      // Emit answer timer started
      io.to(roomCode).emit('answer-timer-started', {
        playerId,
        timeSeconds: session.setup.rules.answerTimeSeconds,
      })
    })

    // Submit answer
    socket.on('submit-answer', ({ roomCode, answer }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const { playerId } = socket.data

      // Check if this player is supposed to answer
      if (!session.answerState || session.answerState.playerId !== playerId) {
        socket.emit('error', { message: 'Not your turn to answer' })
        return
      }

      if (!session.currentClue) {
        socket.emit('error', { message: 'No active clue' })
        return
      }

      // Clear answer timer
      if (session.answerState.timeoutId) {
        clearTimeout(session.answerState.timeoutId)
      }
      session.answerState = undefined

      const clueValue = session.currentClue.clue.value
      const isCorrect = validateAnswer(
        answer,
        session.currentClue.clue.acceptableAnswers
      )

      // Update score
      const currentScore = session.scores.get(playerId) || 0
      if (isCorrect) {
        session.scores.set(playerId, currentScore + clueValue)
      } else {
        session.scores.set(playerId, currentScore - clueValue)
      }

      // Update stats
      const stats = session.stats.get(playerId)
      if (stats) {
        if (isCorrect) {
          stats.correct++
        } else {
          stats.incorrect++
        }
      }

      // Broadcast answer result
      io.to(roomCode).emit('answer-result', {
        playerId,
        answer,
        isCorrect,
        correctAnswer: session.currentClue.clue.acceptableAnswers[0],
        scores: Object.fromEntries(session.scores),
      })

      if (isCorrect) {
        // Winner becomes next selector
        session.currentSelector = playerId

        // Clear buzz state and current clue
        session.buzzState = undefined
        session.currentClue = undefined

        // Emit ready for next clue
        io.to(roomCode).emit('ready-for-next-clue', {
          currentSelector: session.currentSelector,
        })
      } else {
        // Handle incorrect answer (rebound or reveal)
        handleIncorrectAnswer(io, session, roomCode, playerId)
      }
    })

    // Host judges answer (for host-judged mode)
    socket.on('judge-answer', ({ roomCode, playerId, isCorrect }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const { playerId: judgeId } = socket.data

      // Check if judge is the host
      if (session.hostId !== judgeId) {
        socket.emit('error', { message: 'Only the host can judge answers' })
        return
      }

      if (!session.currentClue) {
        socket.emit('error', { message: 'No active clue' })
        return
      }

      // Clear answer timer
      if (session.answerState?.timeoutId) {
        clearTimeout(session.answerState.timeoutId)
      }
      session.answerState = undefined

      const clueValue = session.currentClue.clue.value

      // Update score
      const currentScore = session.scores.get(playerId) || 0
      if (isCorrect) {
        session.scores.set(playerId, currentScore + clueValue)
      } else {
        session.scores.set(playerId, currentScore - clueValue)
      }

      // Update stats
      const stats = session.stats.get(playerId)
      if (stats) {
        if (isCorrect) {
          stats.correct++
        } else {
          stats.incorrect++
        }
      }

      // Broadcast judgment
      io.to(roomCode).emit('answer-judged', {
        playerId,
        isCorrect,
        correctAnswer: session.currentClue.clue.acceptableAnswers[0],
        scores: Object.fromEntries(session.scores),
      })

      if (isCorrect) {
        // Winner becomes next selector
        session.currentSelector = playerId

        // Clear buzz state and current clue
        session.buzzState = undefined
        session.currentClue = undefined

        // Emit ready for next clue
        io.to(roomCode).emit('ready-for-next-clue', {
          currentSelector: session.currentSelector,
        })
      } else {
        // Handle incorrect answer (rebound or reveal)
        handleIncorrectAnswer(io, session, roomCode, playerId)
      }
    })

    // Host controls
    socket.on('host-action', ({ roomCode, action, data }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const { playerId } = socket.data

      // Check if user is the host
      if (session.hostId !== playerId) {
        socket.emit('error', { message: 'Only the host can perform this action' })
        return
      }

      switch (action) {
        case 'skip-clue':
          // Skip current clue
          if (session.currentClue) {
            revealAnswerAndContinue(io, session, roomCode)
          }
          break

        case 'reveal-answer':
          // Reveal answer early
          if (session.currentClue) {
            // Clear any timers
            if (session.answerState?.timeoutId) {
              clearTimeout(session.answerState.timeoutId)
            }
            session.answerState = undefined

            revealAnswerAndContinue(io, session, roomCode)
          }
          break

        case 'adjust-score':
          // Manually adjust player score
          if (data && data.playerId && typeof data.adjustment === 'number') {
            const currentScore = session.scores.get(data.playerId) || 0
            session.scores.set(data.playerId, currentScore + data.adjustment)

            io.to(roomCode).emit('score-adjusted', {
              playerId: data.playerId,
              adjustment: data.adjustment,
              newScore: session.scores.get(data.playerId),
              scores: Object.fromEntries(session.scores),
            })
          }
          break

        case 'pause-game':
          // Pause game (future implementation)
          io.to(roomCode).emit('game-paused', {})
          break

        case 'resume-game':
          // Resume game (future implementation)
          io.to(roomCode).emit('game-resumed', {})
          break

        case 'end-game':
          // End game early
          session.status = 'ended'
          io.to(roomCode).emit('game-ended', {
            finalScores: Object.fromEntries(session.scores),
            stats: Object.fromEntries(session.stats),
          })
          break

        default:
          socket.emit('error', { message: 'Unknown host action' })
      }
    })

    // Game Master: Select a clue
    socket.on('gm-select-clue', ({ roomCode, categoryId, clueId, clue }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Mark clue as used
      session.usedClues.add(clueId)

      // Store current clue
      session.currentClue = {
        roundId: session.setup.rounds[session.currentRoundIndex]?.id || '',
        categoryId,
        clueId,
        clue,
      }

      // Broadcast to all clients (players see the clue)
      io.to(roomCode).emit('clue-selected', {
        categoryId,
        clueId,
        clue: {
          id: clue.id,
          value: clue.value,
          clueText: clue.clueText,
          isDailyDouble: clue.isDailyDouble,
          media: clue.media,
          acceptableAnswers: clue.acceptableAnswers,
        },
        usedClues: Array.from(session.usedClues),
      })
    })

    // Game Master: Award points to a player
    socket.on('gm-award-points', ({ roomCode, playerId, points, scores }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Update scores in session
      if (scores) {
        Object.entries(scores).forEach(([pid, score]) => {
          session.scores.set(pid, score as number)
        })
      } else if (playerId && points !== undefined) {
        const currentScore = session.scores.get(playerId) || 0
        session.scores.set(playerId, currentScore + points)
      }

      // Broadcast score update
      io.to(roomCode).emit('score-updated', {
        scores: Object.fromEntries(session.scores),
      })
    })

    // Game Master: Select drawing option (for hangman display)
    socket.on('gm-select-drawing-option', ({ roomCode, selectedAnswer }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Broadcast the selected answer to all clients
      io.to(roomCode).emit('drawing-option-selected', {
        selectedAnswer,
      })
    })

    // Game Master: Close clue (no points awarded)
    socket.on('gm-close-clue', ({ roomCode }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Clear current clue
      session.currentClue = undefined
      session.buzzState = undefined

      // Broadcast clue closed
      io.to(roomCode).emit('clue-closed', {
        usedClues: Array.from(session.usedClues),
      })
    })

    // Game Master: End game
    socket.on('gm-end-game', ({ roomCode, scores }) => {
      const session = gameSessions.get(roomCode)
      if (!session) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Update final scores
      if (scores) {
        Object.entries(scores).forEach(([pid, score]) => {
          session.scores.set(pid, score as number)
        })
      }

      session.status = 'ended'

      // Broadcast game ended
      io.to(roomCode).emit('game-ended', {
        finalScores: Object.fromEntries(session.scores),
        stats: Object.fromEntries(session.stats),
      })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)

      const { roomCode, playerId } = socket.data

      if (roomCode && playerId) {
        const session = gameSessions.get(roomCode)
        if (session) {
          // Mark player as disconnected but don't remove them yet
          // This allows for reconnection
          const player = session.players.get(playerId)
          if (player) {
            io.to(roomCode).emit('player-left', {
              playerId,
              playerName: player.name,
              players: Array.from(session.players.values()),
            })
          }
        }
      }
    })
  })
}
