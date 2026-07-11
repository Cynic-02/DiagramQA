import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import StreamingOutput from './StreamingOutput';

export type StageStatus = 'idle' | 'running' | 'done' | 'error';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AnimatedPipelineStageProps {
  title: string;
  description: string;
  status: StageStatus;
  logs?: LogEntry[];
  progress?: number; // 0-100
  icon?: React.ReactNode;
  index: number;
  isActive?: boolean;
}

/**
 * AnimatedPipelineStage Component
 * Individual pipeline stage with animated status indicator and streaming output
 */
export default function AnimatedPipelineStage({
  title,
  description,
  status,
  logs = [],
  progress = 0,
  icon,
  index,
  isActive = false,
}: AnimatedPipelineStageProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      case 'running':
        return <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'done':
        return 'from-green-600/20 to-green-600/5 border-green-500/30';
      case 'error':
        return 'from-red-600/20 to-red-600/5 border-red-500/30';
      case 'running':
        return 'from-purple-600/20 to-magenta-600/5 border-purple-500/50';
      default:
        return 'from-white/10 to-white/5 border-white/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: false }}
      className="space-y-4"
    >
      {/* Stage header */}
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <motion.div
          className="flex-shrink-0 relative"
          animate={{
            scale: status === 'running' ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {/* Glow effect for running */}
          {status === 'running' && (
            <motion.div
              className="absolute inset-0 rounded-full bg-purple-500/30 blur-lg"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Status icon background */}
          <div className={`relative p-3 rounded-full bg-gradient-to-br ${getStatusColor()} border backdrop-blur-xl`}>
            {getStatusIcon()}
          </div>

          {/* Stage number */}
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-magenta-600 flex items-center justify-center text-white text-xs font-bold">
            {index + 1}
          </div>
        </motion.div>

        {/* Stage info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-foreground mb-1">{title}</h3>
          <p className="text-sm text-gray-400 font-light">{description}</p>

          {/* Progress bar */}
          {status === 'running' && (
            <motion.div
              className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-magenta-500 to-purple-600"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          )}

          {/* Status text */}
          <motion.div
            className="mt-2 text-xs font-mono text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {status === 'running' && (
              <span className="text-purple-400">
                Processing... {progress}%
              </span>
            )}
            {status === 'done' && (
              <span className="text-green-400">✓ Completed</span>
            )}
            {status === 'error' && (
              <span className="text-red-400">✗ Error</span>
            )}
            {status === 'idle' && (
              <span className="text-gray-500">Waiting...</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Streaming output */}
      {(status === 'running' || (status === 'done' && logs.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4 }}
          className="ml-16"
        >
          <StreamingOutput
            logs={logs}
            isStreaming={status === 'running'}
            title={`${title} Output`}
            maxHeight="max-h-48"
          />
        </motion.div>
      )}

      {/* Divider */}
      <motion.div
        className="ml-6 h-8 border-l border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
    </motion.div>
  );
}
