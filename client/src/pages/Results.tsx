import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo, Button, Card, PlayerCard } from '../components';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import styles from './Results.module.css';

export function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      if (!code) return;
      try {
        const room = await api.getRoom(code);
        setFinalScores(room.scores || {});
        setLoading(false);
      } catch (err) {
        console.error('Failed to load results:', err);
        navigate('/');
      }
    };
    loadResults();
  }, [code, navigate]);

  // Listen for final scores from socket
  useEffect(() => {
    if (!socket) return;

    socket.on('game-ended', (data: { finalScores: Record<string, number> }) => {
      setFinalScores(data.finalScores);
    });

    return () => {
      socket.off('game-ended');
    };
  }, [socket]);

  const sortedPlayers = Object.entries(finalScores)
    .map(([id, score]) => ({
      id,
      name: id,
      score,
      isConnected: true,
    }))
    .sort((a, b) => b.score - a.score);

  const winner = sortedPlayers[0];

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--neon-cyan)', fontSize: '1.5rem' }}>Loading results...</p>
      </div>
    );
  }

  if (!winner) {
    return (
      <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p style={{ color: 'var(--neon-magenta)', fontSize: '1.5rem' }}>No results available</p>
        <Button variant="primary" onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Celebration effects */}
      <div className={styles.confetti}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={styles.confettiPiece}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              backgroundColor: ['#00f5ff', '#ff00aa', '#ffd700', '#00ff88'][Math.floor(Math.random() * 4)],
            }}
          />
        ))}
      </div>

      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Logo size="md" />
          <h1 className={styles.title}>Game Over!</h1>
        </motion.div>

        {/* Winner Showcase */}
        <motion.div
          className={styles.winnerSection}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <div className={styles.crown}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="var(--neon-gold)">
              <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06l-4.23 1.12L12 4 8 9.7l-4.23-1.12c-.8-.22-1.63.26-1.84 1.06-.22.8.26 1.63 1.06 1.84L8 13l-1 5h10l-1-5 5.01-1.52c.8-.21 1.28-1.04 1.06-1.84z" />
            </svg>
          </div>

          <h2 className={styles.winnerLabel}>Winner</h2>
          <div className={styles.winnerName}>{winner.name}</div>
          <div className={styles.winnerScore}>${winner.score.toLocaleString()}</div>

          <div className={styles.trophy}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--neon-gold)" strokeWidth="1.5">
              <path d="M12 15c2.21 0 4-1.79 4-4V5H8v6c0 2.21 1.79 4 4 4z" />
              <path d="M8 7H5c0 1.5.5 3 2 4s2 2 2 3" />
              <path d="M16 7h3c0 1.5-.5 3-2 4s-2 2-2 3" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 15v3" />
            </svg>
          </div>
        </motion.div>

        {/* Podium */}
        <motion.div
          className={styles.podium}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* 2nd Place */}
          <div className={`${styles.podiumSpot} ${styles.second}`}>
            <div className={styles.podiumPlayer}>
              <span className={styles.podiumRank}>2</span>
              <span className={styles.podiumName}>{sortedPlayers[1]?.name}</span>
              <span className={styles.podiumScore}>
                ${sortedPlayers[1]?.score.toLocaleString()}
              </span>
            </div>
            <div className={styles.podiumBase} />
          </div>

          {/* 1st Place */}
          <div className={`${styles.podiumSpot} ${styles.first}`}>
            <div className={styles.podiumPlayer}>
              <span className={styles.podiumRank}>1</span>
              <span className={styles.podiumName}>{sortedPlayers[0]?.name}</span>
              <span className={styles.podiumScore}>
                ${sortedPlayers[0]?.score.toLocaleString()}
              </span>
            </div>
            <div className={styles.podiumBase} />
          </div>

          {/* 3rd Place */}
          <div className={`${styles.podiumSpot} ${styles.third}`}>
            <div className={styles.podiumPlayer}>
              <span className={styles.podiumRank}>3</span>
              <span className={styles.podiumName}>{sortedPlayers[2]?.name}</span>
              <span className={styles.podiumScore}>
                ${sortedPlayers[2]?.score.toLocaleString()}
              </span>
            </div>
            <div className={styles.podiumBase} />
          </div>
        </motion.div>

        {/* Full Leaderboard */}
        <motion.div
          className={styles.leaderboard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card variant="elevated" padding="lg">
            <h3 className={styles.leaderboardTitle}>Final Standings</h3>
            <div className={styles.playerList}>
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
        </motion.div>

        {/* Actions */}
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <Button variant="primary" size="lg" onClick={() => navigate('/setup')}>
            Play Again
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
