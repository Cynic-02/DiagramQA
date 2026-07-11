import { motion } from 'framer-motion';
import DragDropZone from './DragDropZone';
import { RevealOnScroll } from './ParallaxSection';

interface UploadScreenProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

/**
 * UploadScreen Component
 * Main upload interface with drag-drop zone and instructions
 */
export default function UploadScreen({ onUpload, isLoading = false }: UploadScreenProps) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="space-y-16">
        {/* Header */}
        <RevealOnScroll direction="up" duration={0.8}>
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight">
              Upload Your
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-magenta-400 to-purple-600 bg-clip-text text-transparent">
                Diagram
              </span>
            </h1>
            <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">
              Start with any technical diagram - flowcharts, architecture diagrams, entity-relationship diagrams, or any visual documentation. Our AI will transform it into verified assessment questions.
            </p>
          </div>
        </RevealOnScroll>

        {/* Drag-drop zone */}
        <RevealOnScroll direction="up" delay={0.2} duration={0.8}>
          <DragDropZone onFileSelect={onUpload} />
        </RevealOnScroll>

        {/* Features grid */}
        <RevealOnScroll direction="up" delay={0.3} duration={0.8}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {[
              {
                title: 'Multiple Formats',
                description: 'PNG, JPG, PDF - any diagram format',
                icon: '📄',
              },
              {
                title: 'Any Size',
                description: 'Up to 50MB per diagram',
                icon: '📏',
              },
              {
                title: 'Instant Processing',
                description: 'Results in seconds, not hours',
                icon: '⚡',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 hover:border-purple-400/50 transition-all group"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-black text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 font-light">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Info section */}
        <RevealOnScroll direction="up" delay={0.4} duration={0.8}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            {/* What happens next */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-foreground">What Happens Next</h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Vision Extraction', desc: 'AI analyzes your diagram structure' },
                  { step: '2', title: 'Question Generation', desc: 'Creates questions at multiple levels' },
                  { step: '3', title: 'Verification', desc: 'Independent validation of all Q&A pairs' },
                  { step: '4', title: 'Results', desc: 'Download verified assessment questions' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="flex gap-4 items-start"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-magenta-600 flex items-center justify-center text-white font-bold text-sm">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-400 font-light">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-foreground">Pro Tips</h3>
              <div className="space-y-3">
                {[
                  'Use clear, high-contrast diagrams for best results',
                  'Include labels and annotations where possible',
                  'Diagrams with 5-50 elements work best',
                  'Complex hierarchies generate more diverse questions',
                ].map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="flex gap-3 items-start p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all"
                  >
                    <span className="text-purple-400 font-bold flex-shrink-0">✓</span>
                    <p className="text-sm text-gray-300 font-light">{tip}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
}
