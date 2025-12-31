// =============================================================================
// Game Types - PartyJeoparty Type Definitions
// =============================================================================

export interface Player {
  id: string;
  name: string;
  team?: string;
  score: number;
  avatar?: string;
  isConnected: boolean;
  color?: string;
}

export interface Clue {
  id: string;
  value: number;
  clueText: string;
  acceptableAnswers: string[];
  isUsed: boolean;
}

export interface Category {
  id: string;
  name: string;
  clues: Clue[];
}

export interface RoundSetup {
  id: string;
  name: string;
  categories: Category[];
  multiplier: number;
}

export interface GameRules {
  buzzOpenDelayMs: number;
  answerTimeSeconds: number;
  reboundEnabled: boolean;
  validationMode: 'host-judged' | 'auto-check';
  buzzersEnabled: boolean;
}

export interface GameSetup {
  id: string;
  title: string;
  players: Player[];
  rounds: RoundSetup[];
  rules: GameRules;
  singleStationMode: boolean;
}

export interface CurrentClue {
  categoryId: string;
  clueId: string;
  clueText: string;
  value: number;
  acceptableAnswers: string[];
  buzzWinner?: string;
  isOpen: boolean;
}

export interface GameSession {
  code: string;
  setupId: string;
  status: 'lobby' | 'in_round' | 'final' | 'ended';
  scores: Record<string, number>;
  usedClues: Set<string>;
  currentClue?: CurrentClue;
  currentRound: number;
  hostId: string;
}

export type GameStatus = GameSession['status'];
