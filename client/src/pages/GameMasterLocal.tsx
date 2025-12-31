import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, Button, Card, GameBoard } from '../components';
import type { Category, Clue } from '../types/game';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import styles from './GameMasterLocal.module.css';

interface Player {
  id: string;
  name: string;
  color?: string;
  team?: string;
}

interface CurrentClueState {
  category: string;
  categoryId: string;
  clue: Clue;
}

export function GameMasterLocal() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [gameTitle, setGameTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [usedClues, setUsedClues] = useState<Set<string>>(new Set());
  const [currentClue, setCurrentClue] = useState<CurrentClueState | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isDrawingChallenge, setIsDrawingChallenge] = useState(false);
  const [selectedDrawingOption, setSelectedDrawingOption] = useState<number | null>(null);
  const [viewerUrl, setViewerUrl] = useState('');

  // Load room data
  useEffect(() => {
    const loadRoom = async () => {
      if (!code) return;
      try {
        const room = await api.getRoom(code);
        setGameTitle(room.setup?.title || 'Game');

        // Load categories from setup
        if (room.setup?.rounds?.[0]?.categories) {
          setCategories(room.setup.rounds[0].categories.map((cat: Category) => ({
            ...cat,
            clues: cat.clues.map((clue: Clue) => ({ ...clue, isUsed: false })),
          })));
        }

        // Load players from setup (for single-station mode)
        const playerList: Player[] = room.setup?.players?.map((p: Player) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          team: p.team,
        })) || [];
        setPlayers(playerList);

        // Initialize scores
        const initialScores: Record<string, number> = {};
        playerList.forEach(p => {
          initialScores[p.id] = room.scores?.[p.id] || 0;
        });
        setScores(initialScores);

        setUsedClues(new Set(room.usedClues || []));
        setViewerUrl(`${window.location.origin}/game-local/${code}`);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load room:', err);
        navigate('/');
      }
    };
    loadRoom();
  }, [code, navigate]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !code) return;

    socket.emit('join-socket-room', { roomCode: code });

    socket.on('game-ended', () => {
      navigate(`/results/${code}`);
    });

    return () => {
      socket.off('game-ended');
    };
  }, [socket, code, navigate]);

  const selectClue = (categoryId: string, clueId: string) => {
    if (usedClues.has(clueId)) return;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const clue = category.clues.find(c => c.id === clueId);
    if (!clue) return;

    const clueText = clue.clueText || '';
    const isDrawing = clueText.includes('DRAW:') || clueText.includes('DRAW CHALLENGE:');
    setIsDrawingChallenge(isDrawing);
    setSelectedDrawingOption(null);

    setCurrentClue({ category: category.name, categoryId, clue });
    setUsedClues(prev => new Set([...prev, clueId]));
    setShowAnswer(false);
    setSelectedPlayer(null);

    // Broadcast to viewer screen
    if (socket) {
      socket.emit('gm-select-clue', {
        roomCode: code,
        categoryId,
        clueId,
        clue,
        categoryName: category.name,
      });
    }
  };

  const awardPoints = (playerId: string, correct: boolean) => {
    if (!currentClue) return;

    const points = correct ? currentClue.clue.value : -currentClue.clue.value;
    const newScores = { ...scores };
    newScores[playerId] = (newScores[playerId] || 0) + points;
    setScores(newScores);

    // Broadcast score update
    if (socket) {
      socket.emit('gm-award-points', {
        roomCode: code,
        playerId,
        points,
        scores: newScores,
      });
    }

    // Close clue after awarding
    setTimeout(() => {
      closeClue();
    }, 1500);
  };

  const adjustScore = (playerId: string, amount: number) => {
    const newScores = { ...scores };
    newScores[playerId] = (newScores[playerId] || 0) + amount;
    setScores(newScores);

    if (socket) {
      socket.emit('gm-award-points', { roomCode: code, scores: newScores });
    }
  };

  const closeClue = () => {
    setCurrentClue(null);
    setShowAnswer(false);
    setSelectedPlayer(null);
    setIsDrawingChallenge(false);
    setSelectedDrawingOption(null);

    if (socket) {
      socket.emit('gm-close-clue', { roomCode: code, usedClues: Array.from(usedClues) });
    }
  };

  const selectDrawingOption = (index: number) => {
    if (!currentClue || !currentClue.clue.acceptableAnswers[index]) return;

    setSelectedDrawingOption(index);

    // Broadcast to viewer screen
    if (socket) {
      socket.emit('gm-select-drawing-option', {
        roomCode: code,
        selectedAnswer: currentClue.clue.acceptableAnswers[index],
        selectedIndex: index,
      });
    }
  };

  const selectRandomDrawingOption = () => {
    if (currentClue && currentClue.clue.acceptableAnswers.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentClue.clue.acceptableAnswers.length);
      selectDrawingOption(randomIndex);
    }
  };

  const revealAnswer = () => {
    setShowAnswer(true);
    if (socket) {
      socket.emit('gm-reveal-answer', { roomCode: code });
    }
  };

  const endGame = () => {
    if (socket) {
      socket.emit('gm-end-game', { roomCode: code, scores });
    }
    navigate(`/results/${code}`);
  };

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--neon-cyan)', fontSize: '1.5rem' }}>Loading game...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size="sm" animate={false} />
        <div className={styles.headerCenter}>
          <h1 className={styles.title}>{gameTitle}</h1>
          <div className={styles.viewerUrl}>
            <span>Viewer:</span>
            <code>{viewerUrl}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(viewerUrl)}
            >
              Copy
            </Button>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={endGame}>
          End Game
        </Button>
      </header>

      <div className={styles.container}>
        {/* Scoreboard Sidebar */}
        <aside className={styles.sidebar}>
          <Card variant="elevated" padding="md">
            <h3 className={styles.scoresTitle}>Scoreboard</h3>
            <div className={styles.scoresList}>
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`${styles.playerItem} ${selectedPlayer === player.id ? styles.selectedPlayer : ''}`}
                  onClick={() => setSelectedPlayer(selectedPlayer === player.id ? null : player.id)}
                >
                  <div className={styles.playerRank}>#{index + 1}</div>
                  <div
                    className={styles.playerColor}
                    style={{ backgroundColor: player.color || '#00f5ff' }}
                  />
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>{player.name}</span>
                    {player.team && (
                      <span className={styles.playerTeam}>{player.team}</span>
                    )}
                  </div>
                  <div className={styles.playerScore}>${scores[player.id] || 0}</div>
                </div>
              ))}
            </div>

            {/* Quick score adjustments */}
            {selectedPlayer && (
              <div className={styles.scoreControls}>
                <p className={styles.adjustLabel}>
                  Adjust {players.find(p => p.id === selectedPlayer)?.name}'s score:
                </p>
                <div className={styles.adjustButtons}>
                  {[100, 200, 500].map(amount => (
                    <Button
                      key={`add-${amount}`}
                      variant="primary"
                      size="sm"
                      onClick={() => adjustScore(selectedPlayer, amount)}
                    >
                      +${amount}
                    </Button>
                  ))}
                </div>
                <div className={styles.adjustButtons}>
                  {[100, 200, 500].map(amount => (
                    <Button
                      key={`sub-${amount}`}
                      variant="danger"
                      size="sm"
                      onClick={() => adjustScore(selectedPlayer, -amount)}
                    >
                      -${amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </aside>

        {/* Main Content - Board or Clue Controls */}
        <main className={styles.main}>
          <AnimatePresence mode="wait">
            {!currentClue ? (
              /* Game Board */
              <motion.div
                key="board"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GameBoard
                  categories={categories}
                  usedClues={usedClues}
                  onClueSelect={selectClue}
                  disabled={false}
                />
              </motion.div>
            ) : (
              /* Clue Controls */
              <motion.div
                key="clue"
                className={styles.clueDisplay}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className={styles.clueHeader}>
                  <span className={styles.clueCategory}>{currentClue.category}</span>
                  <span className={styles.clueValue}>${currentClue.clue.value}</span>
                </div>

                <div className={styles.clueContent}>
                  {isDrawingChallenge ? (
                    <>
                      <div className={styles.drawingLabel}>DRAWING CHALLENGE</div>
                      {selectedDrawingOption !== null ? (
                        <div className={styles.selectedOption}>
                          <p>Selected: {currentClue.clue.acceptableAnswers[selectedDrawingOption]}</p>
                        </div>
                      ) : (
                        <div className={styles.drawingOptions}>
                          <p>Select what to draw:</p>
                          {currentClue.clue.acceptableAnswers.map((option, index) => (
                            <Button
                              key={index}
                              variant="secondary"
                              onClick={() => selectDrawingOption(index)}
                            >
                              {index + 1}. {option}
                            </Button>
                          ))}
                          <Button variant="gold" onClick={selectRandomDrawingOption}>
                            Pick Random
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className={styles.clueText}>{currentClue.clue.clueText}</p>
                      {/* Answer (for host reference) */}
                      <div className={styles.answerReveal}>
                        <span className={styles.answerLabel}>Answer:</span>
                        <span className={styles.answerText}>{currentClue.clue.acceptableAnswers[0]}</span>
                      </div>
                      {!showAnswer && (
                        <Button variant="secondary" onClick={revealAnswer}>
                          Reveal Answer to Viewers
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Controls */}
                <div className={styles.clueControls}>
                  {/* Player award buttons */}
                  <div className={styles.awardSection}>
                    <p className={styles.awardPrompt}>Award points to:</p>
                    <div className={styles.playerAwardButtons}>
                      {players.map(player => (
                        <div key={player.id} className={styles.playerAwardRow}>
                          <span
                            className={styles.playerAwardName}
                            style={{ borderLeftColor: player.color || '#00f5ff' }}
                          >
                            {player.name}
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => awardPoints(player.id, true)}
                          >
                            +${currentClue.clue.value}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => awardPoints(player.id, false)}
                          >
                            -${currentClue.clue.value}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="ghost" onClick={closeClue}>
                    Close (No Points)
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
