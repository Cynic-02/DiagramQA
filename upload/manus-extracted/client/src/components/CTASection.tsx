import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { RevealOnScroll } from './ParallaxSection';

export default function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Parallax effect - scale and translate
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.05]);
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section id="cta" className="relative py-32 px-4 md:px-8 lg:px-16 overflow-hidden">
      <motion.div
        ref={ref}
        className="container mx-auto max-w-4xl relative z-10"
        style={{ scale, y }}
      >
        <RevealOnScroll direction="up" duration={0.8}>
          <div className="relative">
            {/* Glassmorphic background container */}
            <div className="absolute inset-0 backdrop-blur-xl border border-white/20 rounded-3xl bg-gradient-to-br from-purple-600/20 via-magenta-600/10 to-purple-700/20" />

            {/* Glow effect */}
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-purple-600/50 to-magenta-600/50 rounded-3xl opacity-30 blur-2xl -z-10"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            <div className="relative p-12 md:p-16 lg:p-20">
              {/* Headline */}
              <RevealOnScroll direction="up" delay={0.1} duration={0.8}>
                <h2 className="text-6xl md:text-7xl lg:text-8xl font-black text-foreground leading-tight mb-8">
                  Start
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-magenta-400 to-purple-600 bg-clip-text text-transparent">
                    Building
                  </span>
                  <br />
                  Today
                </h2>
              </RevealOnScroll>

              {/* Description */}
              <RevealOnScroll direction="up" delay={0.2} duration={0.8}>
                <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-12 font-light leading-relaxed">
                  Upload your first diagram and watch the multi-agent pipeline transform it into verified assessment questions.
                </p>
              </RevealOnScroll>

              {/* CTA Button */}
              <RevealOnScroll direction="up" delay={0.3} duration={0.8}>
                <motion.a
                  href="#upload"
                  className="group relative inline-block"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative overflow-hidden px-10 py-5 font-black text-base tracking-wide uppercase">
                    {/* Glassmorphic background */}
                    <div className="absolute inset-0 backdrop-blur-xl border border-white/20 rounded-lg bg-gradient-to-r from-purple-600/90 via-magenta-600/90 to-purple-700/90" />

                    {/* Gradient overlay */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-magenta-500 via-purple-500 to-magenta-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    />

                    {/* Glow */}
                    <motion.div
                      className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-magenta-600 rounded-lg opacity-0 group-hover:opacity-60 blur transition-opacity -z-10"
                    />

                    <span className="relative flex items-center gap-3 text-white">
                      Get Started
                      <motion.svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        animate={{ x: [0, 6, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </motion.svg>
                    </span>
                  </div>
                </motion.a>
              </RevealOnScroll>

              {/* Trust indicators */}
              <RevealOnScroll direction="up" delay={0.4} duration={0.8}>
                <div className="mt-16 flex gap-12 text-sm text-gray-300 font-light">
                  <div>
                    <div className="font-black bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text text-transparent mb-2">
                      6
                    </div>
                    <div>Agents</div>
                  </div>
                  <div>
                    <div className="font-black bg-gradient-to-r from-magenta-400 to-purple-400 bg-clip-text text-transparent mb-2">
                      100%
                    </div>
                    <div>Verified</div>
                  </div>
                  <div>
                    <div className="font-black bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text text-transparent mb-2">
                      ∞
                    </div>
                    <div>Diagrams</div>
                  </div>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </RevealOnScroll>
      </motion.div>
    </section>
  );
}
