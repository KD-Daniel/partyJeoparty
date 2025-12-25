import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo, Button, Card, PlayerCard, GameBoard, ClueReveal } from '../components';
import type { Category, CurrentClue } from '../types/game';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import styles from './Game.module.css';

export function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [categories, setCategories] = useState<Category[]>([]);
  const [usedClues, setUsedClues] = useState<Set<string>>(new Set());
  const [currentClue, setCurrentClue] = useState<CurrentClue | null>(null);
  const [buzzWinner, setBuzzWinner] = useState<string | undefined>();
  const [buzzerName, setBuzzerName] = useState<string | undefined>();
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [hostId, setHostId] = useState<string | null>(null);
  const [canBuzz, setCanBuzz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [selectedDrawingAnswer, setSelectedDrawingAnswer] = useState<string | undefined>();

  // Check if we're the host
  const savedHostId = sessionStorage.getItem('hostId');
  const isHost = savedHostId !== null && savedHostId === hostId;

  // Load room and game state
  useEffect(() => {
    const loadGame = async () => {
      if (!code) return;
      try {
        const room = await api.getRoom(code);
        setHostId(room.hostId);

        // Load game setup
        if (room.setup) {
          const round = room.setup.rounds[0];
          if (round) {
            setCategories(round.categories.map((cat: any) => ({
              ...cat,
              clues: cat.clues.map((clue: any) => ({ ...clue, isUsed: false })),
            })));
          }
        }

        // Build player names from connected socket players
        const names: Record<string, string> = {};
        room.players?.forEach((p: any) => {
          names[p.id] = p.name;
        });
        setPlayerNames(names);

        // Use scores from room (initialized by server with socket player IDs)
        setScores(room.scores || {});
        setUsedClues(new Set(room.usedClues || []));

        setLoading(false);
      } catch (err) {
        console.error('Failed to load game:', err);
        navigate('/');
      }
    };
    loadGame();
  }, [code, navigate]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !code) return;

    // Rejoin the room when Game page loads
    const storedPlayerId = localStorage.getItem(`player_${code}`);
    const storedPlayerName = localStorage.getItem(`playerName_${code}`);
    const storedHostId = sessionStorage.getItem('hostId');

    if (storedPlayerId && storedPlayerName) {
      // Join as player
      socket.emit('join-room', {
        roomCode: code,
        playerName: storedPlayerName,
        playerId: storedPlayerId,
      });
    } else if (storedHostId) {
      // Host viewing without joining as player - still need to join socket room
      socket.emit('join-room', {
        roomCode: code,
        playerName: 'Host',
        playerId: storedHostId,
      });
    }

    // Also just join the socket.io room to receive broadcasts
    socket.emit('join-socket-room', { roomCode: code });

    // Listen for clue selected
    socket.on('clue-selected', (data: any) => {
      console.log('Clue selected:', data);
      setCurrentClue({
        categoryId: data.categoryId,
        clueId: data.clueId,
        clueText: data.clue.clueText,
        value: data.clue.value,
        acceptableAnswers: data.clue.acceptableAnswers || [],
        isOpen: true,
      });
      setUsedClues(new Set(data.usedClues));
      setSelectedDrawingAnswer(undefined); // Reset for new clue
      setBuzzWinner(undefined);
      setBuzzerName(undefined);
      setCanBuzz(false);
    });

    // Listen for buzz enabled
    socket.on('buzz-enabled', () => {
      console.log('Buzzer enabled');
      setCanBuzz(true);
      setBuzzWinner(undefined);
    });

    // Listen for buzz winner
    socket.on('buzz-winner', (data: { playerId: string; playerName: string }) => {
      console.log('Buzz winner:', data);
      setBuzzWinner(data.playerId);
      setBuzzerName(data.playerName);
      setCanBuzz(false);
    });

    // Listen for answer timer started
    socket.on('answer-timer-started', (data: { playerId: string; timeSeconds: number }) => {
      console.log('Answer timer started:', data);
      setTimeRemaining(data.timeSeconds);
    });

    // Listen for answer result
    socket.on('answer-result', (data: any) => {
      console.log('Answer result:', data);
      setScores(data.scores);
      setTimeout(() => {
        setCurrentClue(null);
        setBuzzWinner(undefined);
        setBuzzerName(undefined);
        setTimeRemaining(undefined);
      }, 2000);
    });

    // Listen for answer judged
    socket.on('answer-judged', (data: any) => {
      console.log('Answer judged:', data);
      setScores(data.scores);
      setTimeout(() => {
        setCurrentClue(null);
        setBuzzWinner(undefined);
        setBuzzerName(undefined);
        setTimeRemaining(undefined);
      }, 2000);
    });

    // Listen for answer timeout
    socket.on('answer-timeout', () => {
      console.log('Answer timeout');
      setCanBuzz(true);
      setBuzzWinner(undefined);
    });

    // Listen for ready for next clue
    socket.on('ready-for-next-clue', (data: { currentSelector: string }) => {
      console.log('Ready for next clue:', data);
      setCurrentClue(null);
      setBuzzWinner(undefined);
      setBuzzerName(undefined);
      setTimeRemaining(undefined);
      setCanBuzz(false);
    });

    // Listen for answer revealed
    socket.on('answer-revealed', (data: any) => {
      console.log('Answer revealed:', data);
      setScores(data.scores);
      setTimeout(() => {
        setCurrentClue(null);
        setBuzzWinner(undefined);
        setBuzzerName(undefined);
        setTimeRemaining(undefined);
      }, 2000);
    });

    // Listen for game ended
    socket.on('game-ended', () => {
      console.log('Game ended');
      navigate(`/results/${code}`);
    });

    // Listen for score adjusted
    socket.on('score-adjusted', (data: any) => {
      console.log('Score adjusted:', data);
      setScores(data.scores);
    });

    // Listen for GM score updates
    socket.on('score-updated', (data: any) => {
      console.log('Score updated:', data);
      setScores(data.scores);
    });

    // Listen for GM clue closed
    socket.on('clue-closed', (data: any) => {
      console.log('Clue closed:', data);
      setCurrentClue(null);
      setBuzzWinner(undefined);
      setBuzzerName(undefined);
      setTimeRemaining(undefined);
      setCanBuzz(false);
      setSelectedDrawingAnswer(undefined);
      if (data.usedClues) {
        setUsedClues(new Set(data.usedClues));
      }
    });

    // Listen for GM drawing option selection
    socket.on('drawing-option-selected', (data: { selectedAnswer: string }) => {
      console.log('Drawing option selected:', data);
      setSelectedDrawingAnswer(data.selectedAnswer);
    });

    return () => {
      socket.off('clue-selected');
      socket.off('buzz-enabled');
      socket.off('buzz-winner');
      socket.off('answer-timer-started');
      socket.off('answer-result');
      socket.off('answer-judged');
      socket.off('answer-timeout');
      socket.off('ready-for-next-clue');
      socket.off('answer-revealed');
      socket.off('game-ended');
      socket.off('score-adjusted');
      socket.off('score-updated');
      socket.off('clue-closed');
      socket.off('drawing-option-selected');
    };
  }, [socket, code, navigate]);

  // Handlers
  const handleClueSelect = (categoryId: string, clueId: string) => {
    if (!socket) return;
    const storedPlayerId = localStorage.getItem(`player_${code}`);
    socket.emit('select-clue', {
      roomCode: code,
      categoryId,
      clueId,
      playerId: storedPlayerId,
    });
  };

  const handleBuzz = () => {
    if (!socket || !canBuzz) return;
    socket.emit('buzz', {
      roomCode: code,
    });
  };

  const handleAnswerSubmit = (answer: string) => {
    if (!socket) return;
    socket.emit('submit-answer', {
      roomCode: code,
      answer,
    });
  };

  const handleJudgeAnswer = (isCorrect: boolean) => {
    if (!socket || !buzzWinner) return;
    socket.emit('judge-answer', {
      roomCode: code,
      playerId: buzzWinner,
      isCorrect,
    });
  };

  const handleEndGame = () => {
    if (!socket || !hostId) return;
    socket.emit('host-action', {
      roomCode: code,
      action: 'end-game',
    });
  };

  // Convert scores object to player array for display
  const playersWithScores = Object.entries(scores).map(([id, score]) => ({
    id,
    name: playerNames[id] || id,
    score,
    isConnected: true,
  }));
  const sortedPlayers = [...playersWithScores].sort((a, b) => b.score - a.score);

  // Find current category name for clue reveal
  const currentCategoryName = currentClue
    ? categories.find((c) => c.id === currentClue.categoryId)?.name || ''
    : '';

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
        <div className={styles.roomCode}>
          <span className={styles.codeLabel}>Room</span>
          <span className={styles.code}>{code}</span>
        </div>
        <div className={styles.headerButtons}>
          {isHost && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(`/master/${code}`, '_blank')}
              >
                Game Master
              </Button>
              <Button variant="danger" size="sm" onClick={handleEndGame}>
                End Game
              </Button>
            </>
          )}
        </div>
      </header>

      <div className={styles.container}>
        <motion.aside
          className={styles.sidebar}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card variant="elevated" padding="md">
            <h3 className={styles.scoresTitle}>Scoreboard</h3>
            <div className={styles.scoresList}>
              {sortedPlayers.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  score={player.score}
                  rank={index + 1}
                  isConnected={player.isConnected}
                />
              ))}
            </div>
          </Card>
        </motion.aside>

        <main className={styles.main}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GameBoard
              categories={categories}
              usedClues={usedClues}
              onClueSelect={handleClueSelect}
              disabled={!!currentClue}
            />
          </motion.div>
        </main>
      </div>

      <ClueReveal
        clueText={currentClue?.clueText || ''}
        value={currentClue?.value || 0}
        category={currentCategoryName}
        isOpen={!!currentClue}
        onBuzz={handleBuzz}
        onClose={() => setCurrentClue(null)}
        buzzWinner={buzzerName}
        canBuzz={canBuzz}
        timeRemaining={timeRemaining}
        isHost={isHost}
        onCorrect={() => handleJudgeAnswer(true)}
        onIncorrect={() => handleJudgeAnswer(false)}
        onAnswerSubmit={handleAnswerSubmit}
        selectedDrawingAnswer={selectedDrawingAnswer}
      />
    </div>
  );
}
