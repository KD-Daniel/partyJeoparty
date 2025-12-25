# PartyJeoparty

A simple, customizable Jeopardy-style party game you can run online.

The goal of this project is to make it easy to spin up a new game for any group by providing a **setup page** where the host can configure:

- Players (names, optional teams)
- Categories and clues (questions/answers, difficulty/values)
- Round rules (timers, rebounds, Daily Double on/off)

Then the host starts a room and everyone plays in real time.

## What you’re building

### Core user flow

- **Setup**
  - Host creates a game configuration (players + board)
  - Host chooses rules (timers, validation mode)
  - Host creates a room code

- **Lobby**
  - Players join via room code/link
  - Everyone sees who is connected and ready

- **Game board**
  - Current selector chooses a category/value
  - Clue is shown to everyone
  - Players buzz in; first buzz wins
  - Correct adds points, incorrect subtracts points

- **Final round (optional)**
  - Secret wagers + private answers
  - Reveal, update scores

- **Results**
  - Leaderboard and basic stats

## Simple tech stack (recommended)

To keep the stack small and understandable while still supporting multiplayer:

- **Frontend**: React + Vite (TypeScript optional)
- **Backend**: Node.js + Express
- **Real-time**: Socket.IO (buzzing, timers, state sync)
- **Storage**:
  - **MySQL** for reusable setups/decks (managed with phpMyAdmin)
  - In-memory for active game sessions (with session snapshots optionally persisted)

This avoids deploying multiple services and keeps everything JavaScript.

### Reusable setups means you need persistence

Since you want **reusable** setups/decks, you’ll want a database so hosts can:

- Save a setup once and re-run it many times
- Duplicate/edit an existing setup
- Export/import setups as JSON without copy/pasting

To keep the stack simple (and match your hosting familiarity), use **MySQL** and manage it via **phpMyAdmin**.

## Reusable setup/deck features (recommended)

- **Create**: build a setup in `/setup` and save it as a named deck
- **Browse**: list saved decks (your “deck library”)
- **Edit**: load a deck, change categories/clues/rules, save changes
- **Duplicate**: “Save as…” to create a new deck from an existing one
- **Export/Import**: download/upload deck JSON for sharing

## Pages / screens

- **`/setup`**
  - Create/edit players
  - Create/edit categories and clues
  - Configure rules
  - Save/load/duplicate decks
  - Create room

- **`/room/:code` (lobby)**
  - Join room
  - Ready status

- **`/game/:code` (board + clue view)**
  - Board selection
  - Clue reveal
  - Buzzing + answering
  - Scoreboard

- **`/results/:code`**
  - Final leaderboard

## Minimal data model

### GameSetup (created in setup page)

- `title`
- `players`: `{ id, name, team? }[]`
- `rounds`: `RoundSetup[]`
- `rules`:
  - `buzzOpenDelayMs`
  - `answerTimeSeconds`
  - `reboundEnabled`
  - `validationMode` (host-judged vs auto-check)

### RoundSetup

- `categories`: `{ id, name, clues: ClueSetup[] }[]`

### ClueSetup

- `value`
- `clueText` (and optional media)
- `acceptableAnswers` (one or more)

### GameSession (runtime state)

- `code` (room code)
- `setupId` (or embedded setup)
- `status`: `lobby | in_round | final | ended`
- `scores`: map of `playerId -> number`
- `usedClues`: set of clue IDs
- `currentClue` + timers

## Persistence (MySQL) — minimal approach

Keep the schema minimal by storing the setup as JSON, then evolve later if needed.

- **`decks`**
  - `id` (char(36))
  - `title` (varchar)
  - `setup_json` (longtext)
  - `created_at`, `updated_at` (datetime)

Optional additions (later):

- `games` table to store finished game results and stats
- `users` table if you add accounts

### Environment variables (backend)

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

## Real-time rules (buzzing)

To keep buzzing fair online:

- The server decides when buzzing is enabled.
- The first buzz received by the server wins.
- The winning player gets an answer timer.
- On incorrect, either allow rebound buzzing or reveal answer (host setting).

## Implementation milestones

- **Milestone 1**: Setup page can create, save, and load reusable decks (MySQL)
- **Milestone 2**: Lobby + players join via Socket.IO
- **Milestone 3**: Board + clue reveal + server-authoritative buzzing
- **Milestone 4**: Scoring + rebounds + host controls
- **Milestone 5 (optional)**: Game history (store finished results in MySQL)

## Notes

A broader description of Jeopardy mechanics and an online adaptation lives in:

- `jeopardy-online-platform.md`
