import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, Button, Input, Card } from '../components';
import type { GameRules } from '../types/game';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import styles from './Lobby.module.css';

interface SocketPlayer {
  id: string;
  name: string;
  ready: boolean;
  socketId: string;
}

export function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [players, setPlayers] = useState<SocketPlayer[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState('');
  const [rules, setRules] = useState<GameRules | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're the host (saved from Setup page)
  const savedHostId = sessionStorage.getItem('hostId');
  const isHost = savedHostId !== null && savedHostId === hostId;

  // Load room data from backend
  useEffect(() => {
    const loadRoom = async () => {
      if (!code) return;
      try {
        setLoading(true);
        const room = await api.getRoom(code);
        setHostId(room.hostId);
        setGameTitle(room.setup?.title || 'Game');
        setRules(room.setup?.rules || null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load room:', err);
        setError('Room not found');
        setLoading(false);
      }
    };
    loadRoom();
  }, [code]);

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket || !code) return;

    // Listen for player joined events
    socket.on('player-joined', (data: { playerId: string; playerName: string; players: SocketPlayer[] }) => {
      console.log('Player joined:', data);
      setPlayers(data.players);
    });

    // Listen for player left events
    socket.on('player-left', (data: { playerId: string; playerName: string; players: SocketPlayer[] }) => {
      console.log('Player left:', data);
      setPlayers(data.players);
    });

    // Listen for ready state changes
    socket.on('player-ready-changed', (data: { playerId: string; ready: boolean; players: SocketPlayer[] }) => {
      console.log('Player ready changed:', data);
      setPlayers(data.players);
    });

    // Listen for game started
    socket.on('game-started', () => {
      console.log('Game started, navigating...');
      navigate(`/game/${code}`);
    });

    // Listen for current game state (for reconnections)
    socket.on('game-state', (data: { session: any }) => {
      console.log('Game state received:', data);
      setPlayers(data.session.players || []);
      if (data.session.status !== 'lobby') {
        navigate(`/game/${code}`);
      }
    });

    // Error handling
    socket.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
      alert(data.message);
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-ready-changed');
      socket.off('game-started');
      socket.off('game-state');
      socket.off('error');
    };
  }, [socket, code, navigate]);

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !playerName.trim() || !code) return;

    const playerId = 'player-' + Date.now();
    setMyPlayerId(playerId);

    // Store player ID and name for Game page to use
    localStorage.setItem(`player_${code}`, playerId);
    localStorage.setItem(`playerName_${code}`, playerName.trim());

    socket.emit('join-room', {
      roomCode: code,
      playerName: playerName.trim(),
      playerId,
    });

    setHasJoined(true);
  };

  const toggleReady = () => {
    if (!socket || !hasJoined) return;
    socket.emit('toggle-ready');
  };

  const startGame = () => {
    if (!socket || !savedHostId) return;
    socket.emit('start-game', {
      roomCode: code,
      hostId: savedHostId,
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myPlayer = players.find(p => p.id === myPlayerId);
  const connectedCount = players.length;
  const allReady = players.length >= 2 && players.every(p => p.ready);

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--neon-cyan)', fontSize: '1.5rem' }}>Loading room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p style={{ color: 'var(--neon-magenta)', fontSize: '1.5rem' }}>{error}</p>
        <Button variant="primary" onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgPattern} />

      <header className={styles.header}>
        <Logo size="sm" animate={false} />
        <Button variant="ghost" onClick={() => navigate('/')}>
          Leave
        </Button>
      </header>

      <div className={styles.container}>
        <motion.div
          className={styles.roomInfo}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className={styles.title}>Game Lobby</h2>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>Room Code</span>
            <button className={styles.code} onClick={copyCode}>
              {code}
              <span className={styles.copyIcon}>
                {copied ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </span>
            </button>
            <span className={styles.copyHint}>
              {copied ? 'Copied!' : 'Click to copy'}
            </span>
          </div>
        </motion.div>

        <div className={styles.content}>
          <motion.div
            className={styles.playersSection}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.sectionHeader}>
              <h3>Players</h3>
              <span className={styles.playerCount}>
                {connectedCount} connected
              </span>
            </div>

            <Card variant="elevated" padding="lg">
              <div className={styles.playerList}>
                <AnimatePresence>
                  {players.map((player) => (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem',
                        background: player.ready ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${player.ready ? 'var(--neon-lime)' : 'rgba(255, 255, 255, 0.05)'}`,
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {player.name}
                          {player.id === hostId && <span style={{ marginLeft: '0.5rem', color: 'var(--neon-gold)', fontSize: '0.875rem' }}>(Host)</span>}
                        </div>
                      </div>
                      {player.ready && (
                        <span style={{ color: 'var(--neon-lime)', fontSize: '0.875rem', fontWeight: 500 }}>Ready</span>
                      )}
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {!hasJoined && (
                <form onSubmit={joinGame} className={styles.joinForm}>
                  <Input
                    placeholder="Enter your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={!isConnected}
                  />
                  <Button variant="primary" type="submit" disabled={!isConnected}>
                    {isConnected ? 'Join' : 'Connecting...'}
                  </Button>
                </form>
              )}

              {hasJoined && (
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    variant={myPlayer?.ready ? 'secondary' : 'primary'}
                    onClick={toggleReady}
                    fullWidth
                  >
                    {myPlayer?.ready ? 'Not Ready' : 'Ready'}
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div
            className={styles.infoSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="glow" padding="lg">
              <h3 className={styles.infoTitle}>How to Play</h3>
              <ul className={styles.infoList}>
                <li>
                  <span className={styles.bullet}>1</span>
                  Select a category and point value
                </li>
                <li>
                  <span className={styles.bullet}>2</span>
                  Read the clue and buzz in to answer
                </li>
                <li>
                  <span className={styles.bullet}>3</span>
                  Correct answers add points, wrong answers subtract
                </li>
                <li>
                  <span className={styles.bullet}>4</span>
                  Highest score at the end wins!
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg">
              <h3 className={styles.infoTitle}>Game Settings</h3>
              <div className={styles.settingsList}>
                <div className={styles.setting}>
                  <span className={styles.settingLabel}>Game Title</span>
                  <span className={styles.settingValue}>{gameTitle}</span>
                </div>
                {rules && (
                  <>
                    <div className={styles.setting}>
                      <span className={styles.settingLabel}>Answer Time</span>
                      <span className={styles.settingValue}>{rules.answerTimeSeconds} seconds</span>
                    </div>
                    <div className={styles.setting}>
                      <span className={styles.settingLabel}>Buzz Delay</span>
                      <span className={styles.settingValue}>{rules.buzzOpenDelayMs}ms</span>
                    </div>
                    <div className={styles.setting}>
                      <span className={styles.settingLabel}>Rebounds</span>
                      <span className={styles.settingValue}>{rules.reboundEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className={styles.setting}>
                      <span className={styles.settingLabel}>Validation</span>
                      <span className={styles.settingValue}>{rules.validationMode === 'host-judged' ? 'Host Judged' : 'Auto Check'}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {isHost && (
          <motion.div
            className={styles.startSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="gold"
                size="lg"
                onClick={startGame}
                disabled={!allReady}
              >
                Start Game
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.open(`/master/${code}`, '_blank')}
              >
                Open Game Master View
              </Button>
            </div>
            {connectedCount < 2 ? (
              <p className={styles.waitingText}>
                Waiting for at least 2 players to join...
              </p>
            ) : !allReady && (
              <p className={styles.waitingText}>
                Waiting for all players to be ready...
              </p>
            )}
            <p className={styles.waitingText} style={{ fontSize: '0.875rem', opacity: 0.7 }}>
              Tip: Open Game Master View on a big screen for drawing challenges
            </p>
          </motion.div>
        )}
      </div>

      {/* Floating particles effect */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
