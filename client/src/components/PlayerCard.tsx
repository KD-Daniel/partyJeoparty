import { motion } from 'framer-motion';
import styles from './PlayerCard.module.css';

interface PlayerCardProps {
  name: string;
  score?: number;
  team?: string;
  isHost?: boolean;
  isConnected?: boolean;
  isBuzzing?: boolean;
  rank?: number;
  showScore?: boolean;
  onRemove?: () => void;
}

export function PlayerCard({
  name,
  score = 0,
  team,
  isHost = false,
  isConnected = true,
  isBuzzing = false,
  rank,
  showScore = true,
  onRemove,
}: PlayerCardProps) {
  const getRankColor = (r: number) => {
    if (r === 1) return styles.gold;
    if (r === 2) return styles.silver;
    if (r === 3) return styles.bronze;
    return '';
  };

  return (
    <motion.div
      className={`${styles.card} ${!isConnected ? styles.disconnected : ''} ${isBuzzing ? styles.buzzing : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layout
    >
      {rank && (
        <div className={`${styles.rank} ${getRankColor(rank)}`}>
          #{rank}
        </div>
      )}

      <div className={styles.avatar}>
        <span>{name.charAt(0).toUpperCase()}</span>
        {isHost && <div className={styles.hostBadge}>HOST</div>}
        {!isConnected && <div className={styles.offlineBadge} />}
      </div>

      <div className={styles.info}>
        <h4 className={styles.name}>{name}</h4>
        {team && <span className={styles.team}>{team}</span>}
      </div>

      {showScore && (
        <div className={`${styles.score} ${score < 0 ? styles.negative : ''}`}>
          <span className={styles.scoreLabel}>Score</span>
          <span className={styles.scoreValue}>
            {score < 0 ? '-' : ''}${Math.abs(score).toLocaleString()}
          </span>
        </div>
      )}

      {onRemove && (
        <button className={styles.removeBtn} onClick={onRemove} aria-label="Remove player">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {isBuzzing && <div className={styles.buzzGlow} />}
    </motion.div>
  );
}
