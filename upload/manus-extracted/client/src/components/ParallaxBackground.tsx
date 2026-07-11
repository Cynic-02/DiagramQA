import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

/**
 * ParallaxBackground Component
 * Creates animated floating elements with scroll-based parallax effects
 */
export default function ParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Create multiple parallax layers with different speeds
  const floatingY1 = useTransform(scrollY, [0, 1000], [0, -200]);
  const floatingY2 = useTransform(scrollY, [0, 1000], [0, -300]);
  const floatingY3 = useTransform(scrollY, [0, 1000], [0, -100]);
  const floatingX1 = useTransform(scrollY, [0, 1000], [0, 100]);
  const floatingX2 = useTransform(scrollY, [0, 1000], [0, -150]);

  const rotate1 = useTransform(scrollY, [0, 1000], [0, 360]);
  const rotate2 = useTransform(scrollY, [0, 1000], [0, -360]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Floating blob 1 - top left */}
      <motion.div
        className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-purple-600/30 to-magenta-600/20 rounded-full blur-3xl"
        style={{
          y: floatingY1,
          x: floatingX1,
          rotate: rotate1,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      {/* Floating blob 2 - top right */}
      <motion.div
        className="absolute top-40 -right-40 w-96 h-96 bg-gradient-to-br from-magenta-600/25 to-purple-600/15 rounded-full blur-3xl"
        style={{
          y: floatingY2,
          x: floatingX2,
          rotate: rotate2,
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
      />

      {/* Floating blob 3 - middle */}
      <motion.div
        className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-purple-500/20 to-magenta-500/10 rounded-full blur-3xl"
        style={{
          y: floatingY3,
        }}
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 12, repeat: Infinity, delay: 2 }}
      />

      {/* Floating blob 4 - bottom left */}
      <motion.div
        className="absolute bottom-20 left-1/4 w-64 h-64 bg-gradient-to-br from-magenta-600/20 to-purple-600/10 rounded-full blur-3xl"
        style={{
          y: useTransform(scrollY, [0, 1000], [0, -50]),
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 9, repeat: Infinity, delay: 3 }}
      />

      {/* Floating blob 5 - bottom right */}
      <motion.div
        className="absolute bottom-40 -right-20 w-80 h-80 bg-gradient-to-br from-purple-600/25 to-magenta-600/15 rounded-full blur-3xl"
        style={{
          y: useTransform(scrollY, [0, 1000], [0, -150]),
          x: useTransform(scrollY, [0, 1000], [0, 80]),
        }}
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 11, repeat: Infinity, delay: 4 }}
      />

      {/* Animated gradient mesh overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/50"
        animate={{
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </div>
  );
}
