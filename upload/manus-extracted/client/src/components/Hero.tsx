import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, Suspense, lazy } from 'react';
import { RevealOnScroll } from './ParallaxSection';

const NodeGraph3D = lazy(() => import('./NodeGraph3D'));

/**
 * HERO SECTION - Premium Glassmorphic Design with Parallax Effects
 */
export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Parallax effects
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const contentY = useTransform(scrollY, [0, 300], [0, -100]);
  const canvasY = useTransform(scrollY, [0, 500], [0, 200]); // Canvas moves slower
  const backgroundScale = useTransform(scrollY, [0, 400], [1, 1.1]); // Subtle zoom

  return (
    <motion.section
      ref={containerRef}
      className="relative min-h-screen flex items-stretch overflow-hidden"
      style={{ opacity: heroOpacity }}
    >
      {/* Left content - 60% */}
      <motion.div
        className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-20 relative z-10"
        style={{ y: contentY }}
      >
        {/* Overline - with reveal animation */}
        <RevealOnScroll delay={0} direction="up">
          <div className="mb-8">
            <span className="text-sm font-mono text-purple-300/70 tracking-widest uppercase">
              AI-Powered Assessment
            </span>
          </div>
        </RevealOnScroll>

        {/* Main headline - BOLD with gradient and staggered reveal */}
        <RevealOnScroll delay={0.1} direction="up">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black leading-none mb-8 tracking-tighter">
            <span className="text-foreground block">Extract</span>
            <span className="bg-gradient-to-r from-purple-400 via-magenta-400 to-purple-600 bg-clip-text text-transparent block">
              Knowledge
            </span>
            <span className="text-foreground block">From Diagrams</span>
          </h1>
        </RevealOnScroll>

        {/* Subheading */}
        <RevealOnScroll delay={0.2} direction="up">
          <p className="text-lg md:text-xl text-gray-300 max-w-md mb-12 leading-relaxed font-light">
            Multi-agent AI pipeline transforms technical diagrams into verified assessment questions.
          </p>
        </RevealOnScroll>

        {/* CTA - glassmorphic button with reveal */}
        <RevealOnScroll delay={0.3} direction="up">
          <div className="flex gap-4 items-center">
            <motion.a
              href="#upload"
              className="group relative inline-block"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative overflow-hidden px-8 py-4 font-semibold text-sm tracking-wide uppercase">
                {/* Glassmorphic background */}
                <div className="absolute inset-0 backdrop-blur-xl border border-white/20 rounded-lg bg-gradient-to-r from-purple-600/80 via-magenta-600/80 to-purple-700/80" />

                {/* Gradient overlay on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-magenta-500 via-purple-500 to-magenta-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                />

                {/* Glow effect */}
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-magenta-600 rounded-lg opacity-0 group-hover:opacity-50 blur transition-opacity -z-10"
                />

                <span className="relative flex items-center gap-2 text-white">
                  Start Now
                  <motion.svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </motion.svg>
                </span>
              </div>
            </motion.a>

            <motion.a
              href="#features"
              className="text-sm font-semibold text-purple-300 hover:text-purple-200 transition-colors border-b border-purple-300/30 hover:border-purple-200 pb-1"
              whileHover={{ x: 4 }}
            >
              Learn more →
            </motion.a>
          </div>
        </RevealOnScroll>

        {/* Stats - with staggered reveal */}
        <RevealOnScroll delay={0.4} direction="up">
          <div className="mt-20 flex gap-12 text-sm">
            <div>
              <div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text text-transparent mb-1">
                6
              </div>
              <div className="text-gray-400 font-light">Pipeline Stages</div>
            </div>
            <div>
              <div className="text-2xl font-black bg-gradient-to-r from-magenta-400 to-purple-400 bg-clip-text text-transparent mb-1">
                ∞
              </div>
              <div className="text-gray-400 font-light">Diagram Types</div>
            </div>
            <div>
              <div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text text-transparent mb-1">
                100%
              </div>
              <div className="text-gray-400 font-light">Verified</div>
            </div>
          </div>
        </RevealOnScroll>
      </motion.div>

      {/* Right side - 3D Canvas with parallax */}
      <motion.div
        className="hidden lg:flex flex-1 relative items-center justify-center"
        style={{ y: canvasY }}
      >
        <Suspense fallback={null}>
          <NodeGraph3D />
        </Suspense>

        {/* Glassmorphic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/50 backdrop-blur-sm pointer-events-none" />
      </motion.div>

      {/* Scroll indicator with parallax */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-purple-400/50"
        style={{ y: useTransform(scrollY, [0, 200], [0, 50]) }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </motion.section>
  );
}
