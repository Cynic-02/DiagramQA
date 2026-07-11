import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export type StageStatus = 'idle' | 'running' | 'done' | 'flagged';

interface PipelineStage {
  id: string;
  title: string;
  description: string;
  status: StageStatus;
  output?: string;
  error?: string;
}

interface PipelineViewProps {
  stages: PipelineStage[];
  activeStageId?: string;
}

function StageCard({ stage, index }: { stage: PipelineStage; index: number }) {
  const statusConfig = {
    idle: { icon: null, color: 'text-muted-foreground', bgColor: 'bg-white/5' },
    running: { icon: Loader2, color: 'text-primary', bgColor: 'bg-primary/10' },
    done: { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    flagged: { icon: AlertCircle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  };

  const config = statusConfig[stage.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-6 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden group transition-all duration-300 ${config.bgColor}`}
    >
      {/* Animated gradient background */}
      {stage.status === 'running' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Glow effect */}
      {stage.status === 'done' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        />
      )}

      <div className="flex items-start gap-4 relative z-10">
        <div className="relative flex-shrink-0">
          {stage.status === 'running' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={`w-6 h-6 ${config.color}`} />
            </motion.div>
          ) : Icon ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Icon className={`w-6 h-6 ${config.color}`} />
            </motion.div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-muted" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground">{stage.title}</h3>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                stage.status === 'running'
                  ? 'bg-primary/20 text-primary'
                  : stage.status === 'done'
                    ? 'bg-green-500/20 text-green-500'
                    : stage.status === 'flagged'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-muted text-muted-foreground'
              }`}
            >
              {stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
            </motion.span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{stage.description}</p>

          {/* Output display */}
          <AnimatePresence>
            {stage.output && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Output:</p>
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-foreground font-mono break-words"
                >
                  {stage.output}
                </motion.p>
              </motion.div>
            )}

            {stage.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-destructive/10 rounded-xl border border-destructive/30"
              >
                <p className="text-xs font-medium text-destructive mb-2">Error:</p>
                <p className="text-sm text-destructive/90">{stage.error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function PipelineView({ stages, activeStageId }: PipelineViewProps) {
  const hasRunningStage = stages.some((s) => s.status === 'running');
  const allDone = stages.every((s) => s.status === 'done' || s.status === 'idle');
  const completedCount = stages.filter((s) => s.status === 'done').length;
  const totalCount = stages.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Processing Pipeline
          </h2>
          <p className="text-lg text-muted-foreground">
            {hasRunningStage
              ? 'Multi-agent pipeline is processing your diagram...'
              : allDone
                ? 'All stages completed successfully!'
                : 'Pipeline ready to process'}
          </p>
        </motion.div>

        {/* Progress bar */}
        {hasRunningStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary font-semibold">
                {completedCount} of {totalCount}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-cyan-400 to-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}

        {/* Stage cards */}
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <StageCard key={stage.id} stage={stage} index={index} />
          ))}
        </div>

        {/* Completion message */}
        <AnimatePresence>
          {allDone && stages.some((s) => s.status === 'done') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30 rounded-2xl text-center backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-block mb-3"
              >
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </motion.div>
              <p className="text-green-500 font-semibold text-lg">
                Pipeline completed successfully!
              </p>
              <p className="text-green-500/70 text-sm mt-1">
                Review your verified Q&A pairs below.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
