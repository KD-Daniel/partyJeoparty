// In production, use relative path (nginx proxies to backend)
// In development, use current hostname with port 3001 (for local network access)
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) return '/api';
  // Use current hostname so other devices on network can connect
  const host = window.location.hostname;
  return `http://${host}:3001/api`;
};
const API_BASE_URL = getApiBaseUrl();

interface DeckData {
  title: string;
  setup: {
    title: string;
    players: Array<{ id: string; name: string; team?: string }>;
    rounds: Array<{
      id: string;
      name: string;
      categories: Array<{
        id: string;
        name: string;
        clues: Array<{
          id: string;
          value: number;
          clueText: string;
          acceptableAnswers: string[];
          isDailyDouble?: boolean;
          media?: { type: string; url: string };
        }>;
      }>;
    }>;
    rules: {
      buzzOpenDelayMs: number;
      answerTimeSeconds: number;
      reboundEnabled: boolean;
      validationMode: 'host-judged' | 'auto-check';
    };
  };
}

interface DeckListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface RoomData {
  setupId?: string;
  setup?: DeckData['setup'];
  hostId: string;
}

interface RoomResponse {
  roomCode: string;
  hostId: string;
  status: string;
}

export const api = {
  // Deck endpoints
  async createDeck(data: DeckData) {
    const response = await fetch(`${API_BASE_URL}/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create deck');
    return response.json();
  },

  async getDecks(): Promise<DeckListItem[]> {
    const response = await fetch(`${API_BASE_URL}/decks`);
    if (!response.ok) throw new Error('Failed to fetch decks');
    return response.json();
  },

  async getDeck(id: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${id}`);
    if (!response.ok) throw new Error('Failed to fetch deck');
    return response.json();
  },

  async updateDeck(id: string, data: DeckData) {
    const response = await fetch(`${API_BASE_URL}/decks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update deck');
    return response.json();
  },

  async deleteDeck(id: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete deck');
  },

  async duplicateDeck(id: string, title: string) {
    const response = await fetch(`${API_BASE_URL}/decks/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Failed to duplicate deck');
    return response.json();
  },

  // Room endpoints
  async createRoom(data: RoomData): Promise<RoomResponse> {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create room');
    return response.json();
  },

  async getRoom(code: string) {
    const response = await fetch(`${API_BASE_URL}/rooms/${code}`);
    if (!response.ok) throw new Error('Failed to fetch room');
    return response.json();
  },

  async startRoom(code: string, hostId: string) {
    const response = await fetch(`${API_BASE_URL}/rooms/${code}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId }),
    });
    if (!response.ok) throw new Error('Failed to start room');
    return response.json();
  },

  async endRoom(code: string, hostId: string) {
    const response = await fetch(`${API_BASE_URL}/rooms/${code}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId }),
    });
    if (!response.ok) throw new Error('Failed to end room');
    return response.json();
  },

  async deleteRoom(code: string) {
    const response = await fetch(`${API_BASE_URL}/rooms/${code}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete room');
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};

export type { DeckData, DeckListItem, RoomData, RoomResponse };
