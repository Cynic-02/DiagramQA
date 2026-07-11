import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { useRef } from 'react';

interface ScrollTextProps {
  children: string;
  className?: string;
  splitType?: 'words' | 'characters';
}

/**
 * ScrollText Component
 * Animates text on scroll with character or word-level effects
 */
export function ScrollText({
  children,
  className = '',
  splitType = 'words',
}: ScrollTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const parts = splitType === 'words' ? children.split(' ') : children.split('');

  return (
    <div ref={ref} className={className}>
      <div className="flex flex-wrap gap-1">
        {parts.map((part, i) => {
          const start = i / parts.length;
          const end = (i + 1) / parts.length;

          const opacity = useTransform(scrollYProgress, [start - 0.1, start, end], [0, 1, 1]);
          const y = useTransform(scrollYProgress, [start - 0.1, start, end], [20, 0, 0]);

          return (
            <motion.span
              key={i}
              ref={ref}
              style={{ opacity, y }}
              className="inline-block"
            >
              {part}
              {splitType === 'words' && ' '}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ScrollProgress Component
 * Shows visual progress indicator based on scroll position
 */
interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className = '' }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className={`fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-magenta-500 to-purple-600 origin-left ${className}`}
      style={{ scaleX: scrollYProgress }}
    />
  );
}

/**
 * NumberCounter Component
 * Animates numbers on scroll
 */
interface NumberCounterProps {
  from: number;
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function NumberCounter({
  from,
  to,
  duration = 2,
  className = '',
  suffix = '',
  prefix = '',
}: NumberCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const displayValue = useTransform(scrollYProgress, [0, 1], [from, to], {
    clamp: true,
  });

  const displayText = useMotionTemplate`${displayValue}`;

  return (
    <motion.div ref={ref} className={className}>
      <motion.span suppressHydrationWarning>
        {prefix}
        <motion.span>{Math.round(displayValue.get?.() ?? from)}</motion.span>
        {suffix}
      </motion.span>
    </motion.div>
  );
}
