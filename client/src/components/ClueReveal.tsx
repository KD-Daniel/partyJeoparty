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
  selectedDrawingAnswer?: string;
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
  selectedDrawingAnswer,
}: ClueRevealProps) {
  const [showBuzzPrompt, setShowBuzzPrompt] = useState(false);
  const [answerText, setAnswerText] = useState('');

  // Check if this is a drawing challenge
  const isDrawingChallenge = clueText?.includes('DRAW:') || clueText?.includes('DRAW CHALLENGE:');

  // Generate hangman-style blanks from the selected answer
  const generateBlanks = (answer: string) => {
    return answer.split('').map((char) => {
      if (char === ' ') return '  '; // double space for word gaps
      if (/[a-zA-Z0-9]/.test(char)) return '_';
      return char; // keep punctuation visible
    }).join(' ');
  };

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
              {isDrawingChallenge ? (
                <motion.div
                  className={styles.drawingChallenge}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className={styles.drawingLabel}>DRAWING CHALLENGE</div>
                  {selectedDrawingAnswer ? (
                    <>
                      <p className={styles.drawingInstructions}>Guess what's being drawn!</p>
                      <div className={styles.hangmanBlanks}>
                        {generateBlanks(selectedDrawingAnswer)}
                      </div>
                      <p className={styles.letterCount}>
                        ({selectedDrawingAnswer.replace(/[^a-zA-Z0-9]/g, '').length} letters)
                      </p>
                    </>
                  ) : (
                    <p className={styles.waitingText}>Waiting for host to pick...</p>
                  )}
                </motion.div>
              ) : !clueText ? (
                <motion.div
                  className={styles.waitingForHost}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className={styles.waitingText}>Listen to the host read the question...</p>
                </motion.div>
              ) : (
                <motion.p
                  className={styles.clueText}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {clueText}
                </motion.p>
              )}
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
