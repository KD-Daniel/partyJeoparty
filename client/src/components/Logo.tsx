import { motion } from 'framer-motion';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

export function Logo({ size = 'md', animate = true }: LogoProps) {
  const sizeClasses = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
    xl: styles.xl,
  };

  return (
    <motion.div
      className={`${styles.logo} ${sizeClasses[size]}`}
      initial={animate ? { opacity: 0, y: -20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className={styles.logoInner}>
        <span className={styles.party}>Party</span>
        <span className={styles.jeoparty}>Jeoparty</span>
      </div>
      <div className={styles.underline} />
      <div className={styles.glow} />
    </motion.div>
  );
}
