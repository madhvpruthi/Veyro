import React from 'react';
import Link from 'next/link';
import styles from '../styles/Components.module.css';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  style,
}) => {
  let variantClass = styles.btnPrimary;
  if (variant === 'secondary') variantClass = styles.btnSecondary;
  if (variant === 'outline') variantClass = styles.btnOutline;
  if (variant === 'danger') variantClass = styles.btnDanger;

  let sizeClass = '';
  if (size === 'sm') sizeClass = styles.btnSm;
  if (size === 'lg') sizeClass = styles.btnLg;

  const combinedClass = `${styles.btn} ${variantClass} ${sizeClass} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={combinedClass} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClass}
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
