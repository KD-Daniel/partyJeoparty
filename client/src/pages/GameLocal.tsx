import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, GameBoard } from '../components';
import type { Category, Clue } from '../types/game';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import styles from './GameLocal.module.css';

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

export function GameLocal() {
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
  const [isDrawingChallenge, setIsDrawingChallenge] = useState(false);
  const [selectedDrawingAnswer, setSelectedDrawingAnswer] = useState<string | null>(null);

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

        // Load players from setup
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
        setLoading(false);
      } catch (err) {
        console.error('Failed to load room:', err);
        navigate('/');
      }
    };
    loadRoom();
  }, [code, navigate]);

  // Socket event listeners - VIEWER MODE
  useEffect(() => {
    if (!socket || !code) return;

    socket.emit('join-socket-room', { roomCode: code });

    // GM selects a clue
    socket.on('clue-selected', (data: {
      categoryId: string;
      clueId: string;
      clue: Clue;
      categoryName: string;
    }) => {
      const clueText = data.clue.clueText || '';
      const isDrawing = clueText.includes('DRAW:') || clueText.includes('DRAW CHALLENGE:');
      setIsDrawingChallenge(isDrawing);
      setSelectedDrawingAnswer(null);

      setCurrentClue({
        category: data.categoryName,
        categoryId: data.categoryId,
        clue: data.clue,
      });
      setUsedClues(prev => new Set([...prev, data.clueId]));
      setShowAnswer(false);
    });

    // GM reveals the answer
    socket.on('answer-revealed', () => {
      setShowAnswer(true);
    });

    // GM selects drawing option
    socket.on('drawing-option-selected', (data: { selectedAnswer: string }) => {
      setSelectedDrawingAnswer(data.selectedAnswer);
    });

    // Score updated
    socket.on('score-updated', (data: { scores: Record<string, number> }) => {
      setScores(data.scores);
    });

    // Clue closed
    socket.on('clue-closed', (data: { usedClues: string[] }) => {
      setUsedClues(new Set(data.usedClues));
      setCurrentClue(null);
      setShowAnswer(false);
      setIsDrawingChallenge(false);
      setSelectedDrawingAnswer(null);
    });

    // Game ended
    socket.on('game-ended', () => {
      navigate(`/results/${code}`);
    });

    return () => {
      socket.off('clue-selected');
      socket.off('answer-revealed');
      socket.off('drawing-option-selected');
      socket.off('score-updated');
      socket.off('clue-closed');
      socket.off('game-ended');
    };
  }, [socket, code, navigate]);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  // Generate hangman-style blanks
  const generateBlanks = (answer: string) => {
    return answer.split('').map((char) => {
      if (char === ' ') return '  ';
      if (/[a-zA-Z0-9]/.test(char)) return '_';
      return char;
    }).join(' ');
  };

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
        <h1 className={styles.title}>{gameTitle}</h1>
        <div className={styles.headerSpacer} />
      </header>

      <div className={styles.container}>
        {/* Scoreboard Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.scoreCard}>
            <h3 className={styles.scoresTitle}>Scoreboard</h3>
            <div className={styles.scoresList}>
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className={styles.playerItem}>
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
          </div>
        </aside>

        {/* Main Content - Board or Clue */}
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
                  onClueSelect={() => {}} // Viewer mode - no interaction
                  disabled={true}
                />
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
                  <span className={styles.clueCategory}>{currentClue.category}</span>
                  <span className={styles.clueValue}>${currentClue.clue.value}</span>
                </div>

                <div className={styles.clueContent}>
                  {isDrawingChallenge ? (
                    <>
                      <div className={styles.drawingLabel}>DRAWING CHALLENGE</div>
                      {selectedDrawingAnswer ? (
                        <div className={styles.selectedOption}>
                          <div className={styles.hangmanBlanks}>
                            {generateBlanks(selectedDrawingAnswer)}
                          </div>
                        </div>
                      ) : (
                        <p className={styles.waitingText}>Waiting for host to select...</p>
                      )}
                    </>
                  ) : (
                    <p className={styles.clueText}>{currentClue.clue.clueText}</p>
                  )}
                </div>

                {/* Answer reveal */}
                {showAnswer && !isDrawingChallenge && (
                  <motion.div
                    className={styles.answerReveal}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className={styles.answerLabel}>Answer:</span>
                    <span className={styles.answerText}>{currentClue.clue.acceptableAnswers[0]}</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
