import { motion } from 'framer-motion';

export type DifficultyLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';

interface DifficultyBadgeProps {
  level: DifficultyLevel;
  delay?: number;
  showIcon?: boolean;
}

/**
 * DifficultyBadge Component
 * Displays Bloom's taxonomy difficulty levels with glowing gradient borders
 */
export default function DifficultyBadge({
  level,
  delay = 0,
  showIcon = true,
}: DifficultyBadgeProps) {
  // Color mapping for each difficulty level
  const difficultyConfig: Record<DifficultyLevel, {
    gradient: string;
    glowColor: string;
    bgColor: string;
    textColor: string;
    icon: string;
    description: string;
  }> = {
    Remember: {
      gradient: 'from-blue-500 to-cyan-500',
      glowColor: 'rgba(59, 130, 246, 0.5)',
      bgColor: 'bg-blue-600/20',
      textColor: 'text-blue-300',
      icon: '📚',
      description: 'Recall facts and basic concepts',
    },
    Understand: {
      gradient: 'from-cyan-500 to-teal-500',
      glowColor: 'rgba(34, 197, 94, 0.5)',
      bgColor: 'bg-teal-600/20',
      textColor: 'text-teal-300',
      icon: '💡',
      description: 'Explain ideas or concepts',
    },
    Apply: {
      gradient: 'from-green-500 to-emerald-500',
      glowColor: 'rgba(34, 197, 94, 0.5)',
      bgColor: 'bg-green-600/20',
      textColor: 'text-green-300',
      icon: '⚙️',
      description: 'Use information in new situations',
    },
    Analyze: {
      gradient: 'from-yellow-500 to-orange-500',
      glowColor: 'rgba(234, 179, 8, 0.5)',
      bgColor: 'bg-yellow-600/20',
      textColor: 'text-yellow-300',
      icon: '🔍',
      description: 'Draw connections among ideas',
    },
    Evaluate: {
      gradient: 'from-orange-500 to-red-500',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      bgColor: 'bg-orange-600/20',
      textColor: 'text-orange-300',
      icon: '⚖️',
      description: 'Justify a decision or choice',
    },
    Create: {
      gradient: 'from-red-500 to-pink-500',
      glowColor: 'rgba(236, 72, 153, 0.5)',
      bgColor: 'bg-pink-600/20',
      textColor: 'text-pink-300',
      icon: '✨',
      description: 'Produce new or original work',
    },
  };

  const config = difficultyConfig[level];
  const levelIndex = Object.keys(difficultyConfig).indexOf(level);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.5,
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      whileHover={{ scale: 1.05 }}
      className="group relative inline-block"
    >
      {/* Animated glow background */}
      <motion.div
        className="absolute -inset-1 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${config.glowColor}, transparent)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay,
        }}
      />

      {/* Main badge container */}
      <div className="relative">
        {/* Gradient border effect */}
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay,
          }}
        />

        {/* Badge content */}
        <motion.div
          className={`relative px-4 py-2 rounded-full backdrop-blur-xl border-2 border-transparent bg-gradient-to-r ${config.bgColor} group-hover:border-white/30 transition-all duration-300`}
          style={{
            borderImage: `linear-gradient(135deg, ${config.glowColor}, transparent) 1`,
          }}
          whileHover={{
            boxShadow: `0 0 20px ${config.glowColor}`,
          }}
        >
          <div className="flex items-center gap-2">
            {showIcon && (
              <motion.span
                className="text-sm"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay,
                }}
              >
                {config.icon}
              </motion.span>
            )}
            <span className={`text-xs font-black uppercase tracking-wider ${config.textColor}`}>
              {level}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Tooltip on hover */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        whileHover={{ opacity: 1, y: -40 }}
        transition={{ duration: 0.2 }}
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
      >
        <div className="px-3 py-2 rounded-lg bg-gray-900 border border-white/20 backdrop-blur-xl text-xs text-gray-200 font-light whitespace-nowrap">
          {config.description}
        </div>
      </motion.div>
    </motion.div>
  );
}
