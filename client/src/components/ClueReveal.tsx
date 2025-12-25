import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Input } from './Input';
import styles from './ClueReveal.module.css';

interface ClueRevealProps {
  clueText: string;
  value: number;
  category: string;
  isOpen: boolean;
  onBuzz: () => void;
  onClose: () => void;
  buzzWinner?: string;
  canBuzz: boolean;
  timeRemaining?: number;
  isHost?: boolean;
  onCorrect?: () => void;
  onIncorrect?: () => void;
  onAnswerSubmit?: (answer: string) => void;
  validationMode?: 'host-judged' | 'auto-check';
}

export function ClueReveal({
  clueText,
  value,
  category,
  isOpen,
  onBuzz,
  onClose,
  buzzWinner,
  canBuzz,
  timeRemaining,
  isHost = false,
  onCorrect,
  onIncorrect,
  onAnswerSubmit,
  validationMode = 'host-judged',
}: ClueRevealProps) {
  const [showBuzzPrompt, setShowBuzzPrompt] = useState(false);
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    if (isOpen && canBuzz) {
      const timer = setTimeout(() => setShowBuzzPrompt(true), 500);
      return () => clearTimeout(timer);
    }
    setShowBuzzPrompt(false);
  }, [isOpen, canBuzz]);

  useEffect(() => {
    if (!isOpen) {
      setAnswerText('');
    }
  }, [isOpen]);

  const handleSubmitAnswer = () => {
    if (answerText.trim() && onAnswerSubmit) {
      onAnswerSubmit(answerText.trim());
      setAnswerText('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.container}
            initial={{ scale: 0.8, opacity: 0, rotateX: -10 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={styles.header}>
              <span className={styles.category}>{category}</span>
              <span className={styles.value}>${value}</span>
            </div>

            <div className={styles.clueArea}>
              <motion.p
                className={styles.clueText}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {clueText}
              </motion.p>
            </div>

            {timeRemaining !== undefined && (
              <div className={styles.timer}>
                <div
                  className={styles.timerBar}
                  style={{ width: `${(timeRemaining / 30) * 100}%` }}
                />
                <span className={styles.timerText}>{timeRemaining}s</span>
              </div>
            )}

            <div className={styles.actions}>
              {!buzzWinner && canBuzz && showBuzzPrompt && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={onBuzz}
                    className={styles.buzzButton}
                  >
                    BUZZ IN!
                  </Button>
                </motion.div>
              )}

              {buzzWinner && (
                <motion.div
                  className={styles.buzzWinner}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span className={styles.buzzLabel}>BUZZED IN:</span>
                  <span className={styles.buzzName}>{buzzWinner}</span>

                  {validationMode === 'auto-check' && !isHost && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <Input
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="What is..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitAnswer();
                          }
                        }}
                      />
                      <Button variant="primary" onClick={handleSubmitAnswer}>
                        Submit
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {isHost && buzzWinner && validationMode === 'host-judged' && (
                <div className={styles.hostControls}>
                  <Button variant="primary" onClick={onCorrect}>
                    Correct
                  </Button>
                  <Button variant="danger" onClick={onIncorrect}>
                    Incorrect
                  </Button>
                </div>
              )}

              {isHost && (
                <Button variant="ghost" onClick={onClose} className={styles.closeBtn}>
                  Close Clue
                </Button>
              )}
            </div>

            <div className={styles.scanline} />
            <div className={styles.cornerTL} />
            <div className={styles.cornerTR} />
            <div className={styles.cornerBL} />
            <div className={styles.cornerBR} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
