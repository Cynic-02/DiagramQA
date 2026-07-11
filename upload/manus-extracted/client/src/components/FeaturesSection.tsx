import { motion } from 'framer-motion';
import { Eye, Zap, CheckCircle, BarChart3, Lock, Sparkles } from 'lucide-react';
import GlassmorphicCard from './GlassmorphicCard';
import { RevealOnScroll, StaggerContainer } from './ParallaxSection';

interface Feature {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

const FEATURES: Feature[] = [
  {
    number: '01',
    title: 'Vision Extraction',
    description: 'Advanced AI parses diagrams into structured knowledge graphs.',
    icon: <Eye className="w-8 h-8" />,
    gradient: 'from-purple-500/30 to-magenta-500/20',
  },
  {
    number: '02',
    title: 'Bloom\'s Taxonomy',
    description: 'Generate questions at any cognitive level. Remember to Create.',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-magenta-500/30 to-purple-500/20',
  },
  {
    number: '03',
    title: 'Verified Answers',
    description: 'Independent answering agent validates each question.',
    icon: <CheckCircle className="w-8 h-8" />,
    gradient: 'from-purple-500/30 to-magenta-500/20',
  },
  {
    number: '04',
    title: 'Verification Loop',
    description: 'Automated verification checks for ambiguity and correctness.',
    icon: <BarChart3 className="w-8 h-8" />,
    gradient: 'from-magenta-500/30 to-purple-500/20',
  },
  {
    number: '05',
    title: 'Quality Assurance',
    description: 'Multi-agent pipeline ensures every Q&A pair meets standards.',
    icon: <Lock className="w-8 h-8" />,
    gradient: 'from-purple-500/30 to-magenta-500/20',
  },
  {
    number: '06',
    title: 'Live Progress',
    description: 'Watch the pipeline work in real-time with live updates.',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-magenta-500/30 to-purple-500/20',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-4 md:px-8 lg:px-16 overflow-hidden">
      {/* Section header - with reveal animation */}
      <RevealOnScroll direction="up" duration={0.8}>
        <div className="mb-24 max-w-2xl relative z-10">
          <span className="text-sm font-mono text-purple-300/70 tracking-widest uppercase mb-4 block">
            Capabilities
          </span>
          <h2 className="text-6xl md:text-7xl font-black text-foreground leading-tight mb-6">
            Six Agents,
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-magenta-400 to-purple-600 bg-clip-text text-transparent">
              One Pipeline
            </span>
          </h2>
        </div>
      </RevealOnScroll>

      {/* Features grid - with staggered reveal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.12 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <GlassmorphicCard
              gradient={feature.gradient}
              delay={0}
              className="p-8 h-full"
            >
              <div className="flex flex-col h-full">
                {/* Number */}
                <div className="text-6xl font-black bg-gradient-to-r from-purple-400/40 to-magenta-400/30 bg-clip-text text-transparent mb-4 leading-none">
                  {feature.number}
                </div>

                {/* Icon - animated */}
                <motion.div
                  className="mb-6 text-transparent bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text w-fit"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  {feature.icon}
                </motion.div>

                {/* Title */}
                <h3 className="text-2xl font-black text-foreground mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-magenta-400 group-hover:bg-clip-text transition-all duration-300">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 font-light leading-relaxed text-sm flex-1">
                  {feature.description}
                </p>

                {/* Animated accent line */}
                <motion.div
                  className="mt-6 h-0.5 bg-gradient-to-r from-purple-400 via-magenta-400 to-transparent w-0 group-hover:w-12 transition-all duration-500"
                />
              </div>
            </GlassmorphicCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
