import { motion, useScroll, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  offset?: number;
  scale?: boolean;
  rotate?: boolean;
}

/**
 * ParallaxSection Component
 * Creates scroll-based parallax effects with depth, scale, and rotation
 */
export function ParallaxSection({
  children,
  className = '',
  offset = 50,
  scale = false,
  rotate = false,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const scaleValue = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1]);
  const rotateValue = useTransform(scrollYProgress, [0, 1], [5, -5]);

  return (
    <motion.div
      ref={ref}
      style={{
        y: offset !== 0 ? y : undefined,
        scale: scale ? scaleValue : undefined,
        rotate: rotate ? rotateValue : undefined,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealOnScroll Component
 * Reveals elements with staggered animations as they come into view
 */
interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

export function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.6,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  const directionVariants = {
    up: { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } },
    down: { initial: { opacity: 0, y: -40 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 } },
  };

  return (
    <motion.div
      ref={ref}
      initial={directionVariants[direction].initial}
      whileInView={directionVariants[direction].animate}
      transition={{ duration, delay }}
      viewport={{ once: true, amount: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer Component
 * Container for staggered child animations
 */
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="visible"
      variants={containerVariants}
      viewport={{ once: true, amount: 0.3 }}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
