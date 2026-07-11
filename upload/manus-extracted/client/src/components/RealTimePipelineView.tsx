import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import AnimatedPipelineStage, { StageStatus } from './AnimatedPipelineStage';
import { RevealOnScroll } from './ParallaxSection';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface PipelineStageData {
  id: string;
  title: string;
  description: string;
  status: StageStatus;
  logs: LogEntry[];
  progress: number;
}

interface RealTimePipelineViewProps {
  diagramName?: string;
  isProcessing?: boolean;
  onComplete?: () => void;
}

/**
 * RealTimePipelineView Component
 * Real-time visualization of the AI pipeline with streaming output
 */
export default function RealTimePipelineView({
  diagramName = 'diagram.png',
  isProcessing = false,
  onComplete,
}: RealTimePipelineViewProps) {
  const [stages, setStages] = useState<PipelineStageData[]>([
    {
      id: 'extraction',
      title: 'Vision Extraction',
      description: 'Analyzing diagram structure and extracting visual elements',
      status: 'idle',
      logs: [],
      progress: 0,
    },
    {
      id: 'generation',
      title: 'Question Generation',
      description: 'Creating questions with Bloom\'s taxonomy conditioning',
      status: 'idle',
      logs: [],
      progress: 0,
    },
    {
      id: 'answering',
      title: 'Answering Agent',
      description: 'Independently generating answers to validate questions',
      status: 'idle',
      logs: [],
      progress: 0,
    },
    {
      id: 'verification',
      title: 'Verification Loop',
      description: 'Checking Q&A pairs for correctness and ambiguity',
      status: 'idle',
      logs: [],
      progress: 0,
    },
  ]);

  // Simulate pipeline execution
  useEffect(() => {
    if (!isProcessing) return;

    let currentStageIndex = 0;
    let logCounter = 0;

    const runStage = async (stageIndex: number) => {
      if (stageIndex >= stages.length) {
        // All stages complete
        setStages((prev) =>
          prev.map((s) => ({ ...s, status: 'done' as StageStatus }))
        );
        onComplete?.();
        return;
      }

      const stageDuration = 4000; // 4 seconds per stage
      const logInterval = 600; // Log every 600ms

      // Start stage
      setStages((prev) => {
        const updated = [...prev];
        updated[stageIndex].status = 'running';
        return updated;
      });

      // Simulate logs and progress
      let elapsed = 0;
      let logCount = 0;

      const progressInterval = setInterval(() => {
        elapsed += 100;
        const progress = Math.min((elapsed / stageDuration) * 100, 95);

        setStages((prev) => {
          const updated = [...prev];
          updated[stageIndex].progress = progress;
          return updated;
        });

        // Add logs periodically
        if (elapsed % logInterval < 100) {
          logCount++;
          const messages = [
            'Initializing stage...',
            'Processing input data...',
            'Running AI models...',
            'Validating results...',
            'Finalizing output...',
          ];

          const newLog: LogEntry = {
            id: `${stageIndex}-${logCount}`,
            timestamp: new Date().toLocaleTimeString(),
            message: messages[Math.min(logCount - 1, messages.length - 1)],
            type: logCount % 5 === 0 ? 'success' : 'info',
          };

          setStages((prev) => {
            const updated = [...prev];
            updated[stageIndex].logs = [...updated[stageIndex].logs, newLog];
            return updated;
          });
        }
      }, 100);

      // Complete stage
      await new Promise((resolve) => setTimeout(resolve, stageDuration));
      clearInterval(progressInterval);

      setStages((prev) => {
        const updated = [...prev];
        updated[stageIndex].status = 'done';
        updated[stageIndex].progress = 100;

        // Add completion log
        const completionLog: LogEntry = {
          id: `${stageIndex}-complete`,
          timestamp: new Date().toLocaleTimeString(),
          message: `${stages[stageIndex].title} completed successfully`,
          type: 'success',
        };
        updated[stageIndex].logs = [...updated[stageIndex].logs, completionLog];

        return updated;
      });

      // Move to next stage
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStage(stageIndex + 1);
    };

    runStage(0);
  }, [isProcessing, stages.length, onComplete]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="space-y-12">
        {/* Header */}
        <RevealOnScroll direction="up" duration={0.8}>
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-black text-foreground leading-tight">
              Processing Your
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-magenta-400 to-purple-600 bg-clip-text text-transparent">
                Diagram
              </span>
            </h1>
            <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">
              {diagramName && (
                <>
                  <span className="text-purple-300 font-semibold">{diagramName}</span>
                  <br />
                </>
              )}
              Multi-agent AI pipeline is working on your assessment questions
            </p>
          </div>
        </RevealOnScroll>

        {/* Pipeline visualization */}
        <RevealOnScroll direction="up" delay={0.2} duration={0.8}>
          <div className="space-y-8 pt-8">
            {/* Connection line background */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600/50 via-magenta-600/50 to-purple-600/50 transform -translate-x-1/2 pointer-events-none hidden md:block" />

            {/* Stages */}
            <div className="space-y-8 relative">
              {stages.map((stage, index) => (
                <AnimatedPipelineStage
                  key={stage.id}
                  title={stage.title}
                  description={stage.description}
                  status={stage.status}
                  logs={stage.logs}
                  progress={stage.progress}
                  index={index}
                  isActive={stage.status === 'running'}
                />
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Stats */}
        <RevealOnScroll direction="up" delay={0.3} duration={0.8}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
            {[
              { label: 'Stages', value: stages.length },
              { label: 'Completed', value: stages.filter((s) => s.status === 'done').length },
              { label: 'In Progress', value: stages.filter((s) => s.status === 'running').length },
              { label: 'Logs', value: stages.reduce((acc, s) => acc + s.logs.length, 0) },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-4 rounded-xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 text-center"
              >
                <div className="text-2xl font-black text-transparent bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 font-light mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Overall progress */}
        {isProcessing && (
          <RevealOnScroll direction="up" delay={0.4} duration={0.8}>
            <div className="space-y-3 pt-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-light">Overall Progress</span>
                <span className="text-purple-400 font-mono font-semibold">
                  {Math.round(
                    (stages.filter((s) => s.status === 'done').length / stages.length) * 100
                  )}
                  %
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-xl">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 via-magenta-500 to-purple-600"
                  initial={{ width: '0%' }}
                  animate={{
                    width: `${
                      (stages.filter((s) => s.status === 'done').length / stages.length) * 100
                    }%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </RevealOnScroll>
        )}

        {/* Completion message */}
        <AnimatePresence>
          {!isProcessing && stages.every((s) => s.status === 'done') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 rounded-2xl backdrop-blur-xl border border-green-500/50 bg-gradient-to-br from-green-600/20 to-green-600/5 text-center space-y-4"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: 3 }}
              >
                <div className="text-5xl">✓</div>
              </motion.div>
              <h3 className="text-2xl font-black text-green-300">Pipeline Complete!</h3>
              <p className="text-gray-300 font-light">
                All stages have been processed successfully. Your assessment questions are ready.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
