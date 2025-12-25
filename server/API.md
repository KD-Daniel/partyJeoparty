# PartyJeoparty Backend API Documentation

## Overview

The PartyJeoparty backend provides REST API endpoints for deck management and room creation, plus Socket.IO events for real-time gameplay.

**Base URL**: `http://localhost:3001`

## REST API Endpoints

### Health Check

#### GET /api/health

Check if the server is running.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-25T12:00:00.000Z"
}
```

---

### Decks (Game Setups)

#### POST /api/decks

Create a new deck.

**Request Body**:
```json
{
  "title": "My First Deck",
  "setup": {
    "title": "My First Deck",
    "players": [
      { "id": "p1", "name": "Alice" },
      { "id": "p2", "name": "Bob" }
    ],
    "rounds": [
      {
        "id": "r1",
        "name": "Jeopardy Round",
        "categories": [
          {
            "id": "c1",
            "name": "History",
            "clues": [
              {
                "id": "clue1",
                "value": 100,
                "clueText": "In 1492, Columbus sailed the ocean...",
                "acceptableAnswers": ["blue", "Blue"]
              }
            ]
          }
        ]
      }
    ],
    "rules": {
      "buzzOpenDelayMs": 500,
      "answerTimeSeconds": 10,
      "reboundEnabled": true,
      "validationMode": "auto-check"
    }
  }
}
```

**Response**: `201 Created`

---

#### GET /api/decks

List all decks (metadata only).

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "My First Deck",
    "created_at": "2025-12-25T12:00:00.000Z",
    "updated_at": "2025-12-25T12:00:00.000Z"
  }
]
```

---

#### GET /api/decks/:id

Get a single deck with full setup.

**Response**:
```json
{
  "id": "uuid",
  "title": "My First Deck",
  "setup": { ... },
  "created_at": "2025-12-25T12:00:00.000Z",
  "updated_at": "2025-12-25T12:00:00.000Z"
}
```

---

#### PUT /api/decks/:id

Update a deck.

**Request Body**:
```json
{
  "title": "Updated Title",
  "setup": { ... }
}
```

**Response**: `200 OK`

---

#### DELETE /api/decks/:id

Delete a deck.

**Response**: `204 No Content`

---

#### POST /api/decks/:id/duplicate

Duplicate a deck.

**Request Body**:
```json
{
  "title": "My Deck (Copy)"
}
```

**Response**: `201 Created`

---

### Rooms (Game Sessions)

#### POST /api/rooms

Create a new game room.

**Request Body**:
```json
{
  "setupId": "deck-uuid",  // OR provide "setup" directly
  "hostId": "player-uuid"
}
```

**Response**: `201 Created`
```json
{
  "roomCode": "ABC123",
  "hostId": "player-uuid",
  "status": "lobby"
}
```

---

#### GET /api/rooms/:code

Get room details.

**Response**:
```json
{
  "code": "ABC123",
  "status": "lobby",
  "hostId": "player-uuid",
  "players": [],
  "scores": {},
  "currentRoundIndex": 0,
  "setup": { ... }
}
```

---

#### POST /api/rooms/:code/start

Start the game (host only).

**Request Body**:
```json
{
  "hostId": "player-uuid"
}
```

**Response**: `200 OK`

---

#### POST /api/rooms/:code/end

End the game (host only).

**Request Body**:
```json
{
  "hostId": "player-uuid"
}
```

**Response**: `200 OK`

---

#### DELETE /api/rooms/:code

Delete a room.

**Response**: `204 No Content`

---

## Socket.IO Events

### Client to Server

#### join-room
Join a game room.

**Payload**:
```json
{
  "roomCode": "ABC123",
  "playerName": "Alice",
  "playerId": "p1"
}
```

---

#### toggle-ready
Toggle player ready state.

**Payload**: (none - uses socket.data)

---

#### start-game
Start the game (host only).

**Payload**:
```json
{
  "roomCode": "ABC123",
  "hostId": "host-uuid"
}
```

---

#### select-clue
Select a clue on the board.

**Payload**:
```json
{
  "roomCode": "ABC123",
  "categoryId": "c1",
  "clueId": "clue1"
}
```

---

#### submit-daily-double-wager
Submit wager for Daily Double.

**Payload**:
```json
{
  "roomCode": "ABC123",
  "wager": 500
}
```

---

#### buzz
Buzz in to answer.

**Payload**:
```json
{
  "roomCode": "ABC123"
}
```

---

#### submit-answer
Submit an answer (auto-check mode).

**Payload**:
```json
{
  "roomCode": "ABC123",
  "answer": "blue"
}
```

---

#### judge-answer
Judge an answer (host-judged mode).

**Payload**:
```json
{
  "roomCode": "ABC123",
  "playerId": "p1",
  "isCorrect": true
}
```

---

#### host-action
Perform a host action.

**Payload**:
```json
{
  "roomCode": "ABC123",
  "action": "skip-clue" | "reveal-answer" | "adjust-score" | "pause-game" | "resume-game" | "end-game",
  "data": { ... }  // Optional, depends on action
}
```

For `adjust-score`:
```json
{
  "roomCode": "ABC123",
  "action": "adjust-score",
  "data": {
    "playerId": "p1",
    "adjustment": 100
  }
}
```

---

### Server to Client

#### player-joined
A player joined the room.

**Payload**:
```json
{
  "playerId": "p1",
  "playerName": "Alice",
  "players": [...]
}
```

---

#### player-left
A player left the room.

**Payload**:
```json
{
  "playerId": "p1",
  "playerName": "Alice",
  "players": [...]
}
```

---

#### player-ready-changed
A player's ready state changed.

**Payload**:
```json
{
  "playerId": "p1",
  "ready": true,
  "players": [...]
}
```

---

#### game-state
Current game state (sent to joining players).

**Payload**:
```json
{
  "session": {
    "code": "ABC123",
    "status": "in_round",
    "scores": {},
    "usedClues": [],
    "currentRoundIndex": 0,
    "currentSelector": "p1",
    "players": [...]
  }
}
```

---

#### game-started
Game has started.

**Payload**:
```json
{
  "currentRoundIndex": 0,
  "currentSelector": "p1",
  "round": { ... }
}
```

---

#### clue-selected
A clue was selected.

**Payload**:
```json
{
  "categoryId": "c1",
  "clueId": "clue1",
  "clue": {
    "id": "clue1",
    "value": 100,
    "clueText": "...",
    "isDailyDouble": false
  },
  "usedClues": [],
  "currentSelector": "p1"
}
```

---

#### daily-double-wager-requested
Daily Double wager requested.

**Payload**:
```json
{
  "playerId": "p1",
  "currentScore": 500
}
```

---

#### daily-double-clue-revealed
Daily Double clue revealed after wager.

**Payload**:
```json
{
  "clueText": "...",
  "wager": 500
}
```

---

#### buzz-enabled
Buzzing is now enabled.

**Payload**:
```json
{
  "timestamp": 1234567890,
  "excludedPlayers": []  // For rebounds
}
```

---

#### buzz-winner
A player won the buzz.

**Payload**:
```json
{
  "playerId": "p1",
  "playerName": "Alice",
  "timestamp": 1234567890
}
```

---

#### answer-timer-started
Answer timer started.

**Payload**:
```json
{
  "playerId": "p1",
  "timeSeconds": 10
}
```

---

#### answer-result
Answer was submitted (auto-check).

**Payload**:
```json
{
  "playerId": "p1",
  "answer": "blue",
  "isCorrect": true,
  "correctAnswer": "blue",
  "scores": {}
}
```

---

#### answer-judged
Answer was judged by host.

**Payload**:
```json
{
  "playerId": "p1",
  "isCorrect": true,
  "correctAnswer": "blue",
  "scores": {}
}
```

---

#### answer-timeout
Answer timer expired.

**Payload**:
```json
{
  "playerId": "p1",
  "correctAnswer": "blue"
}
```

---

#### answer-revealed
Answer revealed (no correct answer given).

**Payload**:
```json
{
  "correctAnswer": "blue",
  "scores": {}
}
```

---

#### ready-for-next-clue
Ready for next clue selection.

**Payload**:
```json
{
  "currentSelector": "p1"
}
```

---

#### round-transition
Round completed, transitioning to next.

**Payload**:
```json
{
  "completedRound": "Jeopardy Round",
  "nextRound": "Double Jeopardy",
  "nextRoundIndex": 1,
  "round": { ... },
  "scores": {}
}
```

---

#### game-ended
Game has ended.

**Payload**:
```json
{
  "finalScores": {},
  "stats": {}
}
```

---

#### score-adjusted
Host manually adjusted a score.

**Payload**:
```json
{
  "playerId": "p1",
  "adjustment": 100,
  "newScore": 600,
  "scores": {}
}
```

---

#### error
An error occurred.

**Payload**:
```json
{
  "message": "Error description"
}
```

---

## Data Types

### GameSetup
```typescript
{
  title: string
  players: Player[]
  rounds: RoundSetup[]
  rules: GameRules
}
```

### Player
```typescript
{
  id: string
  name: string
  team?: string
}
```

### RoundSetup
```typescript
{
  id: string
  name: string
  categories: Category[]
}
```

### Category
```typescript
{
  id: string
  name: string
  clues: ClueSetup[]
}
```

### ClueSetup
```typescript
{
  id: string
  value: number
  clueText: string
  acceptableAnswers: string[]
  isDailyDouble?: boolean
  media?: {
    type: 'image' | 'audio' | 'video'
    url: string
  }
}
```

### GameRules
```typescript
{
  buzzOpenDelayMs: number       // Default: 500
  answerTimeSeconds: number     // Default: 10
  reboundEnabled: boolean       // Default: true
  validationMode: 'host-judged' | 'auto-check'  // Default: 'auto-check'
}
```

---

## Running the Server

1. Create `.env` file with database credentials:
```env
PORT=3001
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=partyjeoparty
MYSQL_USER=root
MYSQL_PASSWORD=
```

2. Run database migration:
```bash
npm run migrate
```

3. Start development server:
```bash
npm run dev
```

4. Server will run on `http://localhost:3001`
