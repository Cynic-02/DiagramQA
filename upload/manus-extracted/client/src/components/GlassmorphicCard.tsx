import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  gradient?: string;
  hover?: boolean;
  delay?: number;
}

export default function GlassmorphicCard({
  children,
  className = '',
  gradient = 'from-purple-500/20 to-magenta-500/10',
  hover = true,
  delay = 0,
}: GlassmorphicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className="group"
    >
      <motion.div
        className={`relative overflow-hidden backdrop-blur-xl border border-white/20 rounded-2xl ${className}`}
        whileHover={hover ? { scale: 1.02, borderColor: 'rgba(168, 85, 247, 0.5)' } : {}}
        transition={{ duration: 0.3 }}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        {/* Glassmorphic layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-50" />

        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-gradient-to-r from-purple-400/0 via-magenta-400/50 to-purple-400/0 opacity-0 group-hover:opacity-100"
          animate={{
            boxShadow: [
              'inset 0 0 20px rgba(168, 85, 247, 0)',
              'inset 0 0 40px rgba(168, 85, 247, 0.3)',
              'inset 0 0 20px rgba(168, 85, 247, 0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </motion.div>
  );
}
