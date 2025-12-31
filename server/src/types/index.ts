// Game Setup Types
export interface Player {
  id: string
  name: string
  team?: string
  color?: string
}

export interface ClueSetup {
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

export interface Category {
  id: string
  name: string
  clues: ClueSetup[]
}

export interface RoundSetup {
  id: string
  name: string
  categories: Category[]
}

export interface GameRules {
  buzzOpenDelayMs: number
  answerTimeSeconds: number
  reboundEnabled: boolean
  validationMode: 'host-judged' | 'auto-check'
  buzzersEnabled: boolean
}

export interface GameSetup {
  title: string
  players: Player[]
  rounds: RoundSetup[]
  rules: GameRules
  singleStationMode: boolean
}

export interface Deck {
  id: string
  title: string
  setup_json: string
  created_at: Date
  updated_at: Date
}

// Game Session Types
export interface GameSession {
  code: string
  setupId?: string
  setup: GameSetup
  status: 'lobby' | 'in_round' | 'final' | 'ended'
  scores: Map<string, number>
  usedClues: Set<string>
  currentClue?: {
    roundId: string
    categoryId: string
    clueId: string
    clue: ClueSetup
  }
  currentSelector?: string
  hostId: string
  players: Map<string, {
    id: string
    name: string
    socketId: string
    ready: boolean
  }>
  currentRoundIndex: number
  buzzState?: {
    enabled: boolean
    winner?: string
    excludedPlayers: string[]
  }
  answerState?: {
    playerId: string
    startTime: number
    timeoutId: NodeJS.Timeout
  }
  stats: Map<string, {
    correct: number
    incorrect: number
    buzzWins: number
    totalBuzzTime: number
  }>
}
