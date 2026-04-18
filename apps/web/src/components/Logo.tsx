import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 40, animated = true }) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={animated ? { rotate: -10, scale: 0.9 } : {}}
      animate={
        animated
          ? {
              rotate: 0,
              scale: 1,
              filter: [
                'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))',
                'drop-shadow(0 0 20px rgba(139, 92, 246, 0.8))',
                'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))',
              ],
            }
          : {}
      }
      transition={
        animated
          ? {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {}
      }
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      <path
        d="M75 25C68.5 18.5 59.5 15 50 15C30.7 15 15 30.7 15 50C15 69.3 30.7 85 50 85C59.5 85 68.5 81.5 75 75"
        stroke="url(#logoGradient)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M65 35C61.5 31.5 56 29.5 50 29.5C38.7 29.5 29.5 38.7 29.5 50C29.5 61.3 38.7 70.5 50 70.5C56 70.5 61.5 68.5 65 65"
        stroke="url(#logoGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        style={{ opacity: 0.5 }}
      />
      <path
        d="M60 40C60 40 55 35 50 35C45 35 42 38 42 42C42 46 58 48 58 58C58 62 55 65 50 65C45 65 40 60 40 60"
        stroke="url(#logoGradient)"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </motion.svg>
  );
};
