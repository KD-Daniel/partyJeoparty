import { motion, type HTMLMotionProps } from 'framer-motion';
import styles from './Card.module.css';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  const variantClasses = {
    default: styles.default,
    elevated: styles.elevated,
    bordered: styles.bordered,
    glow: styles.glow,
  };

  const paddingClasses = {
    none: styles.paddingNone,
    sm: styles.paddingSm,
    md: styles.paddingMd,
    lg: styles.paddingLg,
  };

  return (
    <motion.div
      className={`${styles.card} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverable ? styles.hoverable : ''} ${className}`}
      {...props}
    >
      {children}
      <div className={styles.shine} />
    </motion.div>
  );
}
