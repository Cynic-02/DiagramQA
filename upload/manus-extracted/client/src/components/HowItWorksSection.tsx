import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { RevealOnScroll } from './ParallaxSection';

interface Step {
  number: number;
  title: string;
  description: string;
  details: string[];
  gradient: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Upload',
    description: 'Share your technical diagram',
    details: ['PNG, JPG, PDF', 'Any diagram type', 'No size limits'],
    gradient: 'from-purple-500/30 to-magenta-500/20',
  },
  {
    number: 2,
    title: 'Extract',
    description: 'AI parses structure',
    details: ['Entity recognition', 'Relationship mapping', 'Spatial analysis'],
    gradient: 'from-magenta-500/30 to-purple-500/20',
  },
  {
    number: 3,
    title: 'Generate',
    description: 'Create questions',
    details: ['Bloom\'s taxonomy', 'Multiple levels', 'Diverse phrasing'],
    gradient: 'from-purple-500/30 to-magenta-500/20',
  },
  {
    number: 4,
    title: 'Answer',
    description: 'Validate independently',
    details: ['Correctness check', 'No leaks', 'Quality assured'],
    gradient: 'from-magenta-500/30 to-purple-500/20',
  },
  {
    number: 5,
    title: 'Verify',
    description: 'Check for issues',
    details: ['Ambiguity detection', 'Difficulty check', 'Auto-regen'],
    gradient: 'from-purple-500/30 to-magenta-500/20',
  },
  {
    number: 6,
    title: 'Export',
    description: 'Download results',
    details: ['Multiple formats', 'Full metadata', 'Ready to use'],
    gradient: 'from-magenta-500/30 to-purple-500/20',
  },
];

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <section id="how-it-works" className="relative py-32 px-4 md:px-8 lg:px-16 overflow-hidden">
      {/* Header - with reveal animation */}
      <RevealOnScroll direction="up" duration={0.8}>
        <div className="mb-24 max-w-2xl relative z-10">
          <span className="text-sm font-mono text-purple-300/70 tracking-widest uppercase mb-4 block">
            Process
          </span>
          <h2 className="text-6xl md:text-7xl font-black text-foreground leading-tight mb-6">
            Six Steps
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-magenta-400 to-purple-600 bg-clip-text text-transparent">
              To Results
            </span>
          </h2>
        </div>
      </RevealOnScroll>

      {/* Steps - horizontal flow with reveal animations */}
      <div className="space-y-6 lg:space-y-0 lg:flex lg:gap-4 lg:items-stretch relative z-10">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true, amount: 0.3 }}
            className="flex-1 group cursor-pointer"
            onClick={() => setActiveStep(activeStep === step.number ? null : step.number)}
          >
            <motion.div
              className="h-full relative overflow-hidden backdrop-blur-xl border border-white/20 rounded-2xl p-8 group-hover:border-purple-400/50 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              {/* Glassmorphic layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-50" />

              {/* Animated glow */}
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
                animate={{
                  boxShadow: [
                    'inset 0 0 20px rgba(168, 85, 247, 0)',
                    'inset 0 0 40px rgba(168, 85, 247, 0.2)',
                    'inset 0 0 20px rgba(168, 85, 247, 0)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative z-10 flex flex-col h-full">
                {/* Step number */}
                <div className="text-5xl font-black bg-gradient-to-r from-purple-400/40 to-magenta-400/30 bg-clip-text text-transparent mb-4 leading-none">
                  {String(step.number).padStart(2, '0')}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-black text-foreground mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-magenta-400 group-hover:bg-clip-text transition-all duration-300">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 font-light mb-6 flex-1 text-sm">
                  {step.description}
                </p>

                {/* Details - expandable */}
                <motion.div
                  initial={false}
                  animate={
                    activeStep === step.number || window.innerWidth >= 1024
                      ? { height: 'auto', opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    {step.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="text-xs text-gray-300 font-light flex items-center gap-2"
                      >
                        <span className="w-1 h-1 rounded-full bg-gradient-to-r from-purple-400 to-magenta-400" />
                        {detail}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Arrow */}
                {index < STEPS.length - 1 && (
                  <motion.div className="hidden lg:block absolute -right-5 top-1/2 transform -translate-y-1/2 text-purple-400/30 group-hover:text-purple-400/70 transition-colors">
                    <ChevronRight className="w-6 h-6" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
