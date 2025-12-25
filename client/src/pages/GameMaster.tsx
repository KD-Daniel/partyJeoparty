import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, Button } from '../components';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import styles from './GameMaster.module.css';

interface Clue {
  id: string;
  value: number;
  clueText: string;
  acceptableAnswers: string[];
}

interface Category {
  id: string;
  name: string;
  clues: Clue[];
}

interface Player {
  id: string;
  name: string;
}

export function GameMaster() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [categories, setCategories] = useState<Category[]>([]);
  const [usedClues, setUsedClues] = useState<Set<string>>(new Set());
  const [currentClue, setCurrentClue] = useState<{ category: string; clue: Clue } | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameTitle, setGameTitle] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isDrawingChallenge, setIsDrawingChallenge] = useState(false);
  const [selectedDrawingOption, setSelectedDrawingOption] = useState<number | null>(null);

  // Load room data
  useEffect(() => {
    const loadRoom = async () => {
      if (!code) return;
      try {
        const room = await api.getRoom(code);
        setGameTitle(room.setup?.title || 'Game');

        // Load categories from setup
        if (room.setup?.rounds?.[0]?.categories) {
          setCategories(room.setup.rounds[0].categories);
        }

        // Load players from socket players
        const playerList: Player[] = room.players?.map((p: any) => ({
          id: p.id,
          name: p.name,
        })) || [];
        setPlayers(playerList);

        // Initialize scores
        const initialScores: Record<string, number> = {};
        playerList.forEach(p => {
          initialScores[p.id] = room.scores?.[p.id] || 0;
        });
        setScores(initialScores);

        setUsedClues(new Set(room.usedClues || []));
      } catch (err) {
        console.error('Failed to load room:', err);
      }
    };
    loadRoom();
  }, [code]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !code) return;

    socket.emit('join-socket-room', { roomCode: code });

    socket.on('score-updated', (data: { scores: Record<string, number> }) => {
      setScores(data.scores);
    });

    socket.on('clue-revealed', (data: { categoryId: string; clueId: string; clue: Clue }) => {
      const category = categories.find(c => c.id === data.categoryId);
      if (category) {
        setCurrentClue({ category: category.name, clue: data.clue });
        setUsedClues(prev => new Set([...prev, data.clueId]));
      }
    });

    return () => {
      socket.off('score-updated');
      socket.off('clue-revealed');
    };
  }, [socket, code, categories]);

  const selectClue = (category: Category, clue: Clue) => {
    if (usedClues.has(clue.id)) return;

    const clueText = clue.clueText || '';
    const isDrawing = clueText.includes('DRAW:') || clueText.includes('DRAW CHALLENGE:');
    setIsDrawingChallenge(isDrawing);
    setSelectedDrawingOption(null);

    setCurrentClue({ category: category.name, clue });
    setUsedClues(prev => new Set([...prev, clue.id]));
    setShowAnswer(false);
    setSelectedPlayer(null);

    // Broadcast to other screens
    if (socket) {
      socket.emit('gm-select-clue', {
        roomCode: code,
        categoryId: category.id,
        clueId: clue.id,
        clue,
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

  const closeClue = () => {
    setCurrentClue(null);
    setShowAnswer(false);
    setSelectedPlayer(null);
    setIsDrawingChallenge(false);
    setSelectedDrawingOption(null);

    if (socket) {
      socket.emit('gm-close-clue', { roomCode: code });
    }
  };

  const selectRandomDrawingOption = () => {
    if (currentClue && currentClue.clue.acceptableAnswers.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentClue.clue.acceptableAnswers.length);
      setSelectedDrawingOption(randomIndex);
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size="sm" animate={false} />
        <h1 className={styles.title}>{gameTitle}</h1>
        <div className={styles.headerRight}>
          <span className={styles.roomCode}>Room: {code}</span>
          <Button variant="danger" size="sm" onClick={endGame}>
            End Game
          </Button>
        </div>
      </header>

      <div className={styles.container}>
        {/* Scoreboard & Player Selection */}
        <aside className={styles.sidebar}>
          <div className={styles.scoreboard}>
            <h2>Players</h2>
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`${styles.playerItem} ${selectedPlayer === player.id ? styles.selectedPlayer : ''}`}
                onClick={() => setSelectedPlayer(player.id)}
              >
                <span className={styles.rank}>#{index + 1}</span>
                <span className={styles.playerName}>{player.name}</span>
                <span className={styles.playerScore}>${scores[player.id] || 0}</span>
              </div>
            ))}
          </div>

          {/* Quick score adjustment */}
          {selectedPlayer && (
            <div className={styles.scoreControls}>
              <p>Adjust {players.find(p => p.id === selectedPlayer)?.name}'s score:</p>
              <div className={styles.scoreButtons}>
                {[100, 200, 500].map(amount => (
                  <Button
                    key={`add-${amount}`}
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const newScores = { ...scores };
                      newScores[selectedPlayer] = (newScores[selectedPlayer] || 0) + amount;
                      setScores(newScores);
                      if (socket) {
                        socket.emit('gm-award-points', { roomCode: code, scores: newScores });
                      }
                    }}
                  >
                    +${amount}
                  </Button>
                ))}
              </div>
              <div className={styles.scoreButtons}>
                {[100, 200, 500].map(amount => (
                  <Button
                    key={`sub-${amount}`}
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const newScores = { ...scores };
                      newScores[selectedPlayer] = (newScores[selectedPlayer] || 0) - amount;
                      setScores(newScores);
                      if (socket) {
                        socket.emit('gm-award-points', { roomCode: code, scores: newScores });
                      }
                    }}
                  >
                    -${amount}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main area - Board or Clue */}
        <main className={styles.main}>
          <AnimatePresence mode="wait">
            {!currentClue ? (
              /* Game Board */
              <motion.div
                key="board"
                className={styles.board}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Category Headers */}
                <div className={styles.boardRow}>
                  {categories.map(cat => (
                    <div key={cat.id} className={styles.categoryHeader}>
                      {cat.name}
                    </div>
                  ))}
                </div>

                {/* Clue Cells */}
                {[0, 1, 2, 3, 4].map(rowIndex => (
                  <div key={rowIndex} className={styles.boardRow}>
                    {categories.map(cat => {
                      const clue = cat.clues[rowIndex];
                      if (!clue) return <div key={`${cat.id}-${rowIndex}`} className={styles.emptyCell} />;

                      const isUsed = usedClues.has(clue.id);
                      return (
                        <button
                          key={clue.id}
                          className={`${styles.clueCell} ${isUsed ? styles.used : ''}`}
                          onClick={() => !isUsed && selectClue(cat, clue)}
                          disabled={isUsed}
                        >
                          {!isUsed && `$${clue.value}`}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            ) : (
              /* Clue Display */
              <motion.div
                key="clue"
                className={styles.clueDisplay}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className={styles.clueHeader}>
                  <span className={styles.category}>{currentClue.category}</span>
                  <span className={styles.value}>${currentClue.clue.value}</span>
                </div>

                <div className={styles.clueText}>
                  {isDrawingChallenge ? (
                    <>
                      <div className={styles.drawingLabel}>🖍️ DRAWING CHALLENGE</div>
                      <p>Options for the drawer:</p>
                    </>
                  ) : (
                    <p>{currentClue.clue.clueText}</p>
                  )}
                </div>

                {/* Drawing Options */}
                {isDrawingChallenge && currentClue.clue.acceptableAnswers && (
                  <div className={styles.drawingOptions}>
                    {currentClue.clue.acceptableAnswers.map((option, index) => (
                      <div
                        key={index}
                        className={`${styles.drawingOption} ${selectedDrawingOption === index ? styles.selected : ''}`}
                        onClick={() => setSelectedDrawingOption(index)}
                      >
                        <span className={styles.optionNumber}>{index + 1}</span>
                        <span className={styles.optionText}>{option}</span>
                      </div>
                    ))}
                    <Button variant="primary" onClick={selectRandomDrawingOption}>
                      🎲 Pick Random
                    </Button>
                  </div>
                )}

                {/* Answer */}
                {showAnswer && !isDrawingChallenge && (
                  <div className={styles.answer}>
                    <span className={styles.answerLabel}>Answer:</span>
                    <span className={styles.answerText}>{currentClue.clue.acceptableAnswers[0]}</span>
                  </div>
                )}

                {/* Controls */}
                <div className={styles.clueControls}>
                  {!showAnswer && !isDrawingChallenge && (
                    <Button variant="secondary" onClick={() => setShowAnswer(true)}>
                      Show Answer
                    </Button>
                  )}

                  <div className={styles.awardSection}>
                    <p>Award points to:</p>
                    <div className={styles.playerButtons}>
                      {players.map(player => (
                        <div key={player.id} className={styles.playerAward}>
                          <span>{player.name}</span>
                          <div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => awardPoints(player.id, true)}
                            >
                              ✓ Correct
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => awardPoints(player.id, false)}
                            >
                              ✗ Wrong
                            </Button>
                          </div>
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
