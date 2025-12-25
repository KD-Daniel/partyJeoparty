# Jeopardy (Game Overview)

Jeopardy is a quiz game built around a simple twist: players are shown **answers** (called *clues*) and must respond with the **corresponding question**.

A standard round is organized into:

- Categories (e.g., “World History”, “Movies”, “Science”)
- Monetary values per category (e.g., 100–500), where higher values are typically harder
- A shared board where a clue can be selected only once

Players compete to earn the most money by:

- Selecting a category/value
- Buzzing in after the clue is revealed
- Answering correctly (traditionally phrased as a question)

Correct answers add the clue’s value to the player’s score; incorrect answers subtract it.

# How a Jeopardy-Style Game Works Online

This section describes a practical, multiplayer online version of Jeopardy suitable for a web platform.

## Roles

- **Host**
  - Creates or selects a question set
  - Starts the game, controls pacing, and resolves disputes
  - Optionally has moderator tools (skip clue, reveal answer, adjust score)

- **Players**
  - Join a lobby with a link/code
  - Buzz in to answer
  - Accumulate score across rounds

- **Audience (optional)**
  - Can watch in real time
  - May be allowed to chat or react (host-controlled)

## Core Game Objects (Data Model)

- **Game**
  - Lobby state (waiting, in-round, final, ended)
  - Current round, current clue, timers
  - Player list, scores, permissions

- **Board / Round**
  - List of categories
  - Each category contains ordered clues
  - Each clue has: prompt text, acceptable answers, value, and whether it has been used

- **Clue**
  - Display text/media (text, image, audio/video optional)
  - Correct response(s) and matching rules
  - Value and special rules (e.g., Daily Double)

## Typical Online Game Flow

### 1) Lobby / Setup

- Host creates a new game room.
- Players join via invite link or room code.
- Host selects a deck (question set) and configures options:
  - Number of rounds
  - Time limits (buzz window, answer time)
  - Answer validation mode (auto-check vs host-judged)
  - Accessibility options (text size, reduced motion)

### 2) Round Play (Main Board)

- The board is visible to all players.
- The current player (or a rotating turn order) selects a category and value.
- The platform reveals the clue.

#### Buzzing In

To keep it fair online, the platform should use a **server-authoritative buzzer**:

- Buzzing is disabled until a “buzz enabled” moment (immediately or after a short delay)
- First buzz received by the server wins
- The winning player is “locked in” to answer

#### Answering

- The chosen player gets a limited time to answer.
- If correct:
  - Add the clue’s value to their score
  - They choose the next clue
- If incorrect:
  - Subtract the clue’s value
  - Optionally allow a rebound where other players can buzz
  - Or immediately reveal the correct response (host setting)

### 3) Special Clues (Optional but Common)

#### Daily Double (Single Player Wager)

- Only the selecting player can answer
- They wager some amount (bounded by rules)
- Correct adds the wager; incorrect subtracts it

This works well online because it reduces buzzer fairness concerns for that clue.

### 4) Round Transition

- When all clues are used, move to the next round.
- Values may increase and categories change.

### 5) Final Jeopardy-Style Round (Optional)

- All players see a single final category.
- Each player submits a secret wager (within defined bounds).
- The final clue is revealed.
- Each player submits an answer privately.
- After time expires, the system reveals wagers and answers, then updates scores.

### 6) Game End

- Show final leaderboard.
- Optionally show stats:
  - Correct/incorrect counts
  - Buzz speed / win rate
  - Most successful categories

## Online Platform UX (Recommended Screens)

- **Home**
  - Create game
  - Join game

- **Lobby**
  - Player list + ready state
  - Game settings summary
  - Host controls (start, kick, lock room)

- **Game Board**
  - Category grid with values
  - Clearly marked used clues
  - Scoreboard always visible

- **Clue View**
  - Large readable clue
  - Buzz button + buzzer status
  - Answer input (or voice input) for the active player
  - Timer indicators

- **Final Round View**
  - Wager input
  - Private answer input
  - Reveal sequence

## Multiplayer / Real-Time Considerations

- **Server-authoritative timing**
  - The server controls countdowns and buzz eligibility windows.

- **Latency fairness**
  - Use the server’s receive time as the tie-breaker.
  - Optionally add a small “buzz open” delay to reduce advantage from faster clients.

- **Reconnect behavior**
  - If a player disconnects briefly, allow reconnection without losing score.
  - If the current answering player disconnects, host can skip, reassign, or time out.

- **Anti-spam & moderation**
  - Rate-limit buzz attempts
  - Host can mute chat, remove players, and lock the room

## Answer Checking Options

- **Host-judged (simplest, most flexible)**
  - Host marks correct/incorrect.
  - Best for casual play and nuanced answers.

- **Auto-check (more automated)**
  - Store one or more acceptable answers.
  - Use normalization rules:
    - case-insensitive
    - ignore punctuation/extra whitespace
    - optional synonyms
  - Provide host override in case of edge cases.

A good platform supports both, with host override always available.

## Accessibility & Safety

- **Accessibility**
  - Keyboard-only play (tab to buzz, enter to submit)
  - High-contrast mode
  - Screen reader-friendly clue and timer announcements
  - Adjustable font sizes

- **Safety**
  - Private rooms by default
  - Optional profanity filtering for chat
  - Reporting/blocking for public rooms (if public lobbies exist)

# Suggested Rule Defaults (Good for Online Play)

- **Buzz enabled**: 250–500 ms after clue appears (configurable)
- **Answer time**: 7–10 seconds
- **Rebound**: allow one rebound window after an incorrect answer
- **Validation**: host-judged with optional auto-check assist

# What “PartyJeoparty” Could Add (Optional Enhancements)

- Team mode (shared buzzer + team captain answers)
- Custom decks editor (import/export JSON/CSV)
- Media clues (images/audio)
- Post-game highlight reel (fastest buzzes, biggest swings)
