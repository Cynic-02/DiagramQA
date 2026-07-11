import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Hero from '@/components/Hero';
import Header from '@/components/Header';
import Sidebar, { PipelineStage, StageStatus } from '@/components/Sidebar';
import UploadScreen from '@/components/UploadScreen';
import ResultsView, { QuestionAnswerPair } from '@/components/ResultsView';
import FeaturesSection from '@/components/FeaturesSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import ParallaxBackground from '@/components/ParallaxBackground';
import RealTimePipelineView from '@/components/RealTimePipelineView';

type ViewType = 'hero' | 'upload' | 'pipeline' | 'results';

interface PipelineStageData {
  id: string;
  title: string;
  description: string;
  status: StageStatus;
  output?: string;
  error?: string;
}

/**
 * Home Page - Main application layout
 * 
 * Design: Sidebar-driven pipeline navigation with scroll-triggered hero handoff.
 * Vertical slice: upload → full pipeline run → results.
 */
export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('hero');
  const [activeStage, setActiveStage] = useState<PipelineStage>('upload');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pipeline state
  const [stageStatus, setStageStatus] = useState<Record<PipelineStage, StageStatus>>({
    upload: 'idle',
    extraction: 'idle',
    generation: 'idle',
    answering: 'idle',
    verification: 'idle',
    results: 'idle',
  });

  const [pipelineStages, setPipelineStages] = useState<PipelineStageData[]>([
    {
      id: 'extraction',
      title: 'Vision Extraction',
      description: 'Parsing diagram into structured representation',
      status: 'idle',
    },
    {
      id: 'generation',
      title: 'Question Generation',
      description: 'Generating questions with Bloom\'s taxonomy conditioning',
      status: 'idle',
    },
    {
      id: 'answering',
      title: 'Answering Agent',
      description: 'Independently answering generated questions',
      status: 'idle',
    },
    {
      id: 'verification',
      title: 'Verification Loop',
      description: 'Checking Q&A pairs for correctness and ambiguity',
      status: 'idle',
    },
  ]);

  const [results, setResults] = useState<QuestionAnswerPair[]>([
    {
      id: '1',
      question: 'What is the primary function of the API Gateway in this architecture?',
      answer: 'The API Gateway serves as the single entry point for all client requests, handling routing, rate limiting, and authentication before forwarding requests to appropriate microservices.',
      difficulty: 'Understand',
      verified: true,
    },
    {
      id: '2',
      question: 'Explain how the caching layer improves system performance.',
      answer: 'The caching layer stores frequently accessed data in memory (Redis), reducing database queries and response times. Cache invalidation strategies ensure data consistency.',
      difficulty: 'Analyze',
      verified: true,
      ambiguities: ['Cache invalidation strategy not explicitly shown in diagram'],
    },
    {
      id: '3',
      question: 'Design a failover mechanism for the database layer.',
      answer: 'Implement primary-replica replication with automated failover using a consensus algorithm. Configure health checks to detect failures and promote replicas when needed.',
      difficulty: 'Create',
      verified: false,
    },
  ]);

  const mainContentRef = useRef<HTMLDivElement>(null);

  // Simulate pipeline execution
  const handleUpload = (file: File) => {
    setUploadedFile(file);
    setCurrentView('upload');
    setActiveStage('upload');
  };

  const handleProcessDiagram = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setCurrentView('pipeline');
    setActiveStage('extraction');

    // Simulate pipeline stages
    const stages: PipelineStage[] = ['extraction', 'generation', 'answering', 'verification'];

    for (const stage of stages) {
      setStageStatus((prev) => ({ ...prev, [stage]: 'running' }));
      setPipelineStages((prev) =>
        prev.map((s) => (s.id === stage ? { ...s, status: 'running' } : s))
      );

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStageStatus((prev) => ({ ...prev, [stage]: 'done' }));
      setPipelineStages((prev) =>
        prev.map((s) =>
          s.id === stage
            ? {
                ...s,
                status: 'done',
                output: `${stage.charAt(0).toUpperCase() + stage.slice(1)} completed successfully`,
              }
            : s
        )
      );

      setActiveStage(stages[stages.indexOf(stage) + 1] || 'results');
    }

    setStageStatus((prev) => ({ ...prev, results: 'done' }));
    setCurrentView('results');
    setActiveStage('results');
    setIsProcessing(false);
  };

  const handleStageClick = (stage: PipelineStage) => {
    setActiveStage(stage);
    if (stage === 'upload') setCurrentView('upload');
    else if (stage === 'results') setCurrentView('results');
  };

  return (
    <div className="flex flex-col bg-background min-h-screen relative">
      {/* Parallax background */}
      <ParallaxBackground />

      {/* Header */}
      <Header />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <Sidebar
          activeStage={activeStage}
          stageStatus={stageStatus}
          isCollapsed={sidebarCollapsed && isProcessing}
          onStageClick={handleStageClick}
        />

        {/* Main content */}
        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto"
        >
          {/* Hero section */}
          {currentView === 'hero' && (
            <>
              <Hero />
              <FeaturesSection />
              <HowItWorksSection />
              <CTASection />
            </>
          )}

          {/* Upload section */}
          {currentView === 'upload' && (
            <section id="upload" className="min-h-screen flex items-center justify-center px-4 py-12">
              <UploadScreen
                onUpload={handleUpload}
                isLoading={isProcessing}
              />
            </section>
          )}

          {/* Pipeline section */}
          {currentView === 'pipeline' && (
            <section className="min-h-screen flex items-center justify-center px-4 py-12">
              <RealTimePipelineView
                diagramName={uploadedFile?.name}
                isProcessing={isProcessing}
                onComplete={() => {
                  setCurrentView('results');
                }}
              />
            </section>
          )}

          {/* Results section */}
          {currentView === 'results' && (
            <section className="min-h-screen flex items-center justify-center px-4 py-12">
              <ResultsView
                pairs={results}
                diagramName={uploadedFile?.name}
                onExport={() => {
                  // Export functionality
                  console.log('Exporting results...');
                }}
              />
            </section>
          )}

          {/* Action button (visible when on upload screen) */}
          {currentView === 'upload' && uploadedFile && !isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed bottom-8 right-8 z-20"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleProcessDiagram}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Process Diagram
              </motion.button>
            </motion.div>
          )}

          {/* Footer */}
          {currentView === 'hero' && <Footer />}
        </main>
      </div>
    </div>
  );
}
