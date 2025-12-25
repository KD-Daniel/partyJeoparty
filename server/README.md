# PartyJeoparty Server

Backend server for PartyJeoparty - a Jeopardy-style online party game.

## Tech Stack

- **Node.js** + **Express** - REST API server
- **Socket.IO** - Real-time gameplay communication
- **MySQL** - Deck persistence
- **TypeScript** - Type safety
- **mysql2** - MySQL driver with promises

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MySQL server running locally or accessible remotely
- Database created (default name: `partyjeoparty`)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create `.env` file in the server directory:
   ```env
   PORT=3001
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_DATABASE=partyjeoparty
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password_here
   ```

3. **Run database migration**:
   ```bash
   npm run migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:3001`

---

## Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run migrate` - Run database migration

---

## Project Structure

```
server/
├── src/
│   ├── db/
│   │   ├── index.ts           # MySQL connection pool
│   │   ├── schema.sql         # Database schema definition
│   │   └── migrate.ts         # Database migration script
│   ├── routes/
│   │   ├── decks.ts           # Deck CRUD API endpoints
│   │   └── rooms.ts           # Room management API endpoints
│   ├── socket/
│   │   └── handlers.ts        # Socket.IO event handlers
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── index.ts               # Main server entry point
├── .env                       # Environment variables (create this)
├── .env.example               # Environment template
├── package.json
├── tsconfig.json
├── API.md                     # Complete API documentation
├── IMPLEMENTATION_STATUS.md   # Implementation progress
└── README.md                  # This file
```

---

## Features

### REST API
- **Health Check**: `GET /api/health`
- **Deck Management**: Full CRUD operations
  - `POST /api/decks` - Create deck
  - `GET /api/decks` - List all decks
  - `GET /api/decks/:id` - Get single deck
  - `PUT /api/decks/:id` - Update deck
  - `DELETE /api/decks/:id` - Delete deck
  - `POST /api/decks/:id/duplicate` - Duplicate deck
- **Room Management**:
  - `POST /api/rooms` - Create game room
  - `GET /api/rooms/:code` - Get room details
  - `POST /api/rooms/:code/start` - Start game
  - `POST /api/rooms/:code/end` - End game
  - `DELETE /api/rooms/:code` - Delete room

### Socket.IO Events
Real-time gameplay with 20+ Socket.IO events:

**Lobby Events**:
- `join-room`, `player-joined`, `player-left`
- `toggle-ready`, `player-ready-changed`
- `start-game`, `game-started`

**Gameplay Events**:
- `select-clue`, `clue-selected`
- `buzz`, `buzz-enabled`, `buzz-winner`
- `submit-answer`, `answer-result`, `answer-timeout`
- `judge-answer`, `answer-judged`

**Game Flow Events**:
- `round-transition`, `game-ended`
- `ready-for-next-clue`

**Daily Double Events**:
- `daily-double-wager-requested`
- `submit-daily-double-wager`
- `daily-double-clue-revealed`

**Host Controls**:
- `host-action` (skip, reveal, adjust-score, pause, resume, end)

See `API.md` for complete documentation.

---

## Game Features

### Core Gameplay
- Server-authoritative buzzer system
- Configurable buzz delay (default: 500ms)
- Answer timer (configurable, default: 10s)
- Automatic round transitions
- Multi-round support

### Scoring
- Real-time score tracking
- Correct answer: +value
- Incorrect answer: -value
- Negative scores allowed
- Statistics tracking (correct/incorrect/buzz wins)

### Answer Validation
Two modes:
1. **Auto-check**: Normalizes answers (case-insensitive, no punctuation)
2. **Host-judged**: Host manually approves/rejects

### Advanced Features
- **Daily Doubles**: Wager-based clues
- **Rebound Buzzing**: Allow other players to answer after incorrect
- **Host Controls**: Skip, reveal, adjust scores, end game
- **Room Codes**: 6-character unique codes (e.g., "ABC123")

---

## Configuration

Game rules are configurable per deck:

```typescript
{
  buzzOpenDelayMs: 500,           // Delay before buzzing enabled
  answerTimeSeconds: 10,          // Time to answer after buzzing
  reboundEnabled: true,           // Allow rebounds on incorrect
  validationMode: "auto-check"    // or "host-judged"
}
```

---

## Database Schema

### `decks` Table
```sql
CREATE TABLE decks (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  setup_json LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_title (title)
);
```

---

## Development

### Adding New Features

1. **New REST Endpoint**:
   - Add route in `src/routes/`
   - Import in `src/index.ts`
   - Document in `API.md`

2. **New Socket.IO Event**:
   - Add handler in `src/socket/handlers.ts`
   - Update types in `src/types/index.ts`
   - Document in `API.md`

3. **Database Changes**:
   - Update `src/db/schema.sql`
   - Create new migration or update existing
   - Run `npm run migrate`

### Type Definitions

All types are in `src/types/index.ts`:
- `GameSetup` - Deck configuration
- `GameSession` - Active game state
- `Player`, `RoundSetup`, `Category`, `ClueSetup`, etc.

---

## Testing

### Manual Testing

1. **Test REST API**:
   ```bash
   # Create a deck
   curl -X POST http://localhost:3001/api/decks \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Deck","setup":{...}}'

   # Create a room
   curl -X POST http://localhost:3001/api/rooms \
     -H "Content-Type: application/json" \
     -d '{"setupId":"deck-id","hostId":"host-123"}'
   ```

2. **Test Socket.IO**:
   Use a Socket.IO client or browser console:
   ```javascript
   const socket = io('http://localhost:3001');
   socket.emit('join-room', {
     roomCode: 'ABC123',
     playerName: 'Alice',
     playerId: 'p1'
   });
   ```

---

## Production Deployment

### Environment Variables
Set the following in production:
```env
PORT=3001
MYSQL_HOST=your-db-host
MYSQL_PORT=3306
MYSQL_DATABASE=partyjeoparty
MYSQL_USER=your-db-user
MYSQL_PASSWORD=your-db-password
```

### Build and Run
```bash
npm run build
npm start
```

### Recommended Setup
- Use a process manager (PM2, systemd)
- Enable HTTPS/TLS
- Use a reverse proxy (nginx)
- Configure CORS for your frontend domain
- Set up database backups
- Monitor logs and errors

---

## Troubleshooting

### Database Connection Failed
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database exists: `CREATE DATABASE partyjeoparty;`
- Check firewall allows connection to MySQL port

### Socket.IO Connection Issues
- Check CORS configuration in `src/index.ts`
- Verify frontend is using correct server URL
- Check browser console for errors

### Port Already in Use
- Change `PORT` in `.env`
- Or kill process using port 3001:
  ```bash
  # Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F

  # Linux/Mac
  lsof -ti:3001 | xargs kill
  ```

---

## Support

- **API Documentation**: See `API.md`
- **Implementation Status**: See `IMPLEMENTATION_STATUS.md`
- **Project README**: See `../README.md` (root)

---

## License

See root project README for license information.
