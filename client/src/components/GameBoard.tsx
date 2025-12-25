import { motion } from 'framer-motion';
import type { Category } from '../types/game';
import styles from './GameBoard.module.css';

interface GameBoardProps {
  categories: Category[];
  usedClues: Set<string>;
  onClueSelect: (categoryId: string, clueId: string) => void;
  disabled?: boolean;
}

export function GameBoard({ categories, usedClues, onClueSelect, disabled = false }: GameBoardProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, rotateX: -15 },
    visible: {
      opacity: 1,
      scale: 1,
      rotateX: 0,
      transition: { duration: 0.4, ease: 'easeOut' as const },
    },
  };

  return (
    <motion.div
      className={styles.board}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Category Headers */}
      {categories.map((category) => (
        <motion.div
          key={`header-${category.id}`}
          className={styles.categoryHeader}
          variants={itemVariants}
        >
          <span className={styles.categoryName}>{category.name}</span>
          <div className={styles.headerGlow} />
        </motion.div>
      ))}

      {/* Clue Cells - Row by row */}
      {[0, 1, 2, 3, 4].map((rowIndex) =>
        categories.map((category) => {
          const clue = category.clues[rowIndex];
          if (!clue) return null;

          const isUsed = usedClues.has(clue.id);

          return (
            <motion.button
              key={clue.id}
              className={`${styles.clueCell} ${isUsed ? styles.used : ''}`}
              variants={itemVariants}
              onClick={() => !isUsed && !disabled && onClueSelect(category.id, clue.id)}
              disabled={isUsed || disabled}
              whileHover={!isUsed && !disabled ? { scale: 1.05, zIndex: 10 } : undefined}
              whileTap={!isUsed && !disabled ? { scale: 0.95 } : undefined}
            >
              {!isUsed && (
                <>
                  <span className={styles.value}>${clue.value}</span>
                  <div className={styles.cellGlow} />
                </>
              )}
            </motion.button>
          );
        })
      )}
    </motion.div>
  );
}
