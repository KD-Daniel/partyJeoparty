import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo, Button, Input, Card } from '../components';
import styles from './Home.module.css';

export function Home() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.toUpperCase()}`);
    }
  };

  const handleQuickStart = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.setup || !json.title) {
          throw new Error('Invalid deck format');
        }
        // Store in localStorage for Setup page to pick up
        localStorage.setItem('quickStartDeck', JSON.stringify(json));
        navigate('/setup?quickstart=true');
      } catch (error) {
        console.error('Failed to import deck:', error);
        alert('Failed to import deck. Please check the file format.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  return (
    <div className={styles.page}>
      {/* Animated background elements */}
      <div className={styles.bgEffects}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.grid} />
      </div>

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Logo size="xl" />
        </motion.div>

        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          The ultimate party trivia experience
        </motion.p>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Card variant="glow" padding="lg" className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Host a Game</h3>
            <p className={styles.cardDesc}>
              Create a new game session and invite your friends to play
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/setup')}
            >
              Create Game
            </Button>
            <div style={{ marginTop: 'var(--space-sm)', textAlign: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleQuickStart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--neon-cyan)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                }}
              >
                Quick Start from JSON
              </button>
            </div>
          </Card>

          <Card variant="elevated" padding="lg" className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Join a Game</h3>
            <p className={styles.cardDesc}>
              Enter a room code to join an existing game session
            </p>
            <form onSubmit={handleJoinRoom} className={styles.joinForm}>
              <Input
                placeholder="Enter room code..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={styles.codeInput}
              />
              <Button variant="secondary" size="lg" type="submit" fullWidth>
                Join Game
              </Button>
            </form>
          </Card>
        </motion.div>

        <motion.div
          className={styles.features}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </span>
            <span>Real-time buzzing</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span>Multiplayer fun</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <span>Custom categories</span>
          </div>
        </motion.div>
      </div>

      <footer className={styles.footer}>
        <a
          onClick={() => navigate('/guide')}
          style={{
            color: 'var(--neon-cyan)',
            cursor: 'pointer',
            textDecoration: 'none',
            marginRight: 'var(--space-lg)'
          }}
        >
          How to Play
        </a>
        <span>PartyJeoparty &copy; 2024</span>
      </footer>
    </div>
  );
}
