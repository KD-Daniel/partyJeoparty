# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PartyJeoparty is a multiplayer Jeopardy-style party game with real-time gameplay via Socket.IO. Hosts create customizable question decks, players join via room codes, and compete with server-authoritative buzzing for fairness.

## Development Commands

```bash
# Run both client and server in development
npm run dev

# Run individually
npm run dev:client    # Vite dev server for React frontend
npm run dev:server    # Backend server (requires server workspace to be created)

# Build for production
npm run build

# Start production server
npm run start

# Lint client code
npm run lint --workspace=client
```

## Architecture

**Monorepo Structure** (npm workspaces):
- `client/` - React 18 + Vite + TypeScript frontend
- `server/` - Node.js + Express backend (not yet created)

**Tech Stack**:
- Frontend: React 18, Vite 6, TypeScript, Socket.IO Client
- Backend: Node.js, Express, Socket.IO
- Database: MySQL with JSON blob storage for decks (managed via phpMyAdmin)
- Real-time: Socket.IO for buzzing, timers, and state sync

**Key Design Decisions**:
- Server-authoritative buzzing: server decides buzz eligibility and winner (first received wins)
- In-memory game sessions with optional MySQL persistence for finished games
- Decks stored as JSON blobs in MySQL for simplicity
- Host-judged or auto-check answer validation (host can always override)

## Data Model

**GameSetup** (created in setup page):
- `players`: `{ id, name, team? }[]`
- `rounds`: array of categories, each with clues (value, text, acceptableAnswers)
- `rules`: buzzOpenDelayMs, answerTimeSeconds, reboundEnabled, validationMode

**GameSession** (runtime state):
- `code`, `status` (lobby | in_round | final | ended), `scores`, `usedClues`, `currentClue`

## Routes

- `/setup` - Create/edit game configuration and decks
- `/room/:code` - Lobby for players to join and ready up
- `/game/:code` - Active game board, buzzing, and scoring
- `/results/:code` - Final leaderboard

## Environment Variables (Backend)

```
MYSQL_HOST
MYSQL_PORT
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
```

## Implementation Status

The project follows 5 milestones (see README.md):
1. Setup page with deck persistence (MySQL)
2. Lobby + Socket.IO player joining
3. Board + clue reveal + server-authoritative buzzing
4. Scoring + rebounds + host controls
5. Game history (optional)

Currently: Early stage - client workspace scaffolded, server workspace not yet created.

## Reference Documentation

- `README.md` - Project goals, data model, routes, milestones
- `jeopardy-online-platform.md` - Detailed game mechanics, buzzing rules, UX screens
