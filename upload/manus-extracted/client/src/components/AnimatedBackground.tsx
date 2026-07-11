import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Primary gradient blob - Purple to Magenta */}
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-600 via-magenta-600 to-purple-700 rounded-full blur-3xl opacity-40"
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary gradient blob - Magenta to Pink */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-bl from-magenta-500 via-pink-500 to-magenta-600 rounded-full blur-3xl opacity-30"
        animate={{
          x: [0, -80, 60, 0],
          y: [0, 100, -50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Tertiary gradient blob - Purple to Blue */}
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-600 rounded-full blur-3xl opacity-35"
        animate={{
          x: [0, 50, -100, 0],
          y: [0, -80, 80, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Accent gradient blob - Pink to Purple */}
      <motion.div
        className="absolute bottom-0 right-1/3 w-72 h-72 bg-gradient-to-tl from-pink-600 via-purple-600 to-magenta-600 rounded-full blur-3xl opacity-25"
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 120, -60, 0],
          scale: [1, 0.85, 1.15, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      {/* Top right accent - Magenta glow */}
      <motion.div
        className="absolute top-1/4 right-0 w-80 h-80 bg-gradient-to-l from-magenta-600 via-purple-600 to-transparent rounded-full blur-3xl opacity-20"
        animate={{
          x: [0, -40, 40, 0],
          y: [0, 60, -60, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-magenta-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-background/20 to-background pointer-events-none" />
    </div>
  );
}
