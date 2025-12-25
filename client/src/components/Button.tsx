import { motion, type HTMLMotionProps } from 'framer-motion';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: styles.primary,
    secondary: styles.secondary,
    danger: styles.danger,
    gold: styles.gold,
    ghost: styles.ghost,
  };

  const sizeClasses = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  };

  return (
    <motion.button
      className={`${styles.button} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? styles.fullWidth : ''} ${className}`}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      {...props}
    >
      {loading && (
        <span className={styles.spinner}>
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 15" />
          </svg>
        </span>
      )}
      {icon && !loading && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>{children}</span>
      <span className={styles.shine} />
    </motion.button>
  );
}
