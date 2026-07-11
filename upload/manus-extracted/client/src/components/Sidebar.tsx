import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Upload,
  Eye,
  Zap,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export type PipelineStage = 'upload' | 'extraction' | 'generation' | 'answering' | 'verification' | 'results';
export type StageStatus = 'idle' | 'running' | 'done' | 'flagged';

interface SidebarProps {
  activeStage: PipelineStage;
  stageStatus: Record<PipelineStage, StageStatus>;
  isCollapsed?: boolean;
  onStageClick?: (stage: PipelineStage) => void;
}

const STAGES = [
  { id: 'upload' as const, label: 'Upload Diagram', icon: Upload },
  { id: 'extraction' as const, label: 'Extraction (Vision)', icon: Eye },
  { id: 'generation' as const, label: 'Question Generation', icon: Zap },
  { id: 'answering' as const, label: 'Answering Agent', icon: CheckCircle },
  { id: 'verification' as const, label: 'Verification Loop', icon: AlertCircle },
  { id: 'results' as const, label: 'Results & History', icon: ChevronRight },
];

function StatusIndicator({ status }: { status: StageStatus }) {
  const statusConfig = {
    idle: { color: 'bg-muted', label: 'Idle' },
    running: { color: 'bg-primary animate-pulse-glow', label: 'Running' },
    done: { color: 'bg-green-500', label: 'Done' },
    flagged: { color: 'bg-amber-500', label: 'Flagged' },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      className={`w-2.5 h-2.5 rounded-full ${config.color}`}
      title={config.label}
      animate={status === 'running' ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export default function Sidebar({
  activeStage,
  stageStatus,
  isCollapsed = false,
  onStageClick,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <motion.button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-20 left-4 z-40 md:hidden p-2.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </motion.button>

      {/* Sidebar */}
      <motion.aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border-r border-white/10 z-30 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } md:static md:w-64 md:z-auto pt-20`}
        animate={{
          x: mobileOpen ? 0 : -256,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <img
              src="/manus-storage/ar2-logo_0a6289ce.png"
              alt="AR2-DDCQG"
              className="w-8 h-8"
            />
            {!isCollapsed && (
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-foreground">AR2-DDCQG</h2>
                <p className="text-xs text-muted-foreground">Pipeline</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Pipeline stages */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const status = stageStatus[stage.id];
              const isActive = activeStage === stage.id;

              return (
                <motion.button
                  key={stage.id}
                  onClick={() => {
                    onStageClick?.(stage.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Background gradient for active state */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl"
                      layoutId="activeStage"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  {/* Border for active state */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 border border-primary/30 rounded-xl"
                      layoutId="activeBorder"
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {status === 'running' && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-primary"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      )}
                    </div>

                    {!isCollapsed && (
                      <>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{stage.label}</p>
                        </div>
                        <StatusIndicator status={status} />
                      </>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </nav>

        {/* Footer info */}
        {!isCollapsed && (
          <motion.div
            className="p-4 border-t border-white/10 text-xs text-muted-foreground bg-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-medium text-foreground mb-1">Pipeline Status</p>
            <p>{activeStage}</p>
          </motion.div>
        )}
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
