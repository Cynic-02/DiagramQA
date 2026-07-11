import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface StreamingOutputProps {
  logs: LogEntry[];
  isStreaming?: boolean;
  title?: string;
  maxHeight?: string;
}

/**
 * StreamingOutput Component
 * Displays real-time streaming output with typing animation and log history
 */
export default function StreamingOutput({
  logs,
  isStreaming = false,
  title = 'Output',
  maxHeight = 'max-h-96',
}: StreamingOutputProps) {
  const [displayedLogs, setDisplayedLogs] = useState<LogEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (logs.length > displayedLogs.length) {
      const newLog = logs[logs.length - 1];
      const timer = setTimeout(() => {
        setDisplayedLogs([...displayedLogs, newLog]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [logs, displayedLogs]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  const getLogBgColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
          {title}
        </h3>
        {isStreaming && (
          <motion.div
            className="flex items-center gap-2 text-xs text-green-400 font-semibold"
            animate={{ opacity: [0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-green-400"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            LIVE
          </motion.div>
        )}
      </div>

      {/* Logs container */}
      <div
        className={`${maxHeight} overflow-y-auto space-y-2 p-4 rounded-xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 font-mono text-xs`}
      >
        <AnimatePresence mode="popLayout">
          {displayedLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-gray-500 text-center py-8"
            >
              Waiting for output...
            </motion.div>
          ) : (
            displayedLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-3 rounded-lg border ${getLogBgColor(log.type)} group hover:border-white/30 transition-all`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className={`font-bold ${getLogColor(log.type)}`}>
                        {log.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 break-words leading-relaxed">
                      {log.message}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(log.message, log.id)}
                    className="flex-shrink-0 p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </motion.button>
                </div>

                {/* Streaming animation for latest log */}
                {index === displayedLogs.length - 1 && isStreaming && (
                  <motion.div
                    className="mt-2 h-1 bg-gradient-to-r from-purple-500 via-magenta-500 to-transparent"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Streaming indicator */}
        {isStreaming && displayedLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-400 text-xs mt-4"
          >
            <motion.div
              className="flex gap-1"
              animate={{ opacity: [0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>
                ●
              </motion.span>
              <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}>
                ●
              </motion.span>
              <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}>
                ●
              </motion.span>
            </motion.div>
            Processing...
          </motion.div>
        )}
      </div>
    </div>
  );
}
