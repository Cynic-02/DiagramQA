import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-white/10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Glassmorphic background */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/75 to-background/80" />

      {/* Gradient border glow */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between">
        {/* Logo - with gradient glow */}
        <motion.a
          href="/"
          className="flex items-center gap-2 font-black text-lg text-foreground hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-magenta-400 hover:bg-clip-text transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <img
            src="/manus-storage/ar2-logo_0a6289ce.png"
            alt="AR2"
            className="w-6 h-6"
          />
          <span className="hidden sm:inline">AR2</span>
        </motion.a>

        {/* Nav - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Docs', href: '#' },
          ].map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              className="text-gray-300 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-magenta-400 hover:bg-clip-text transition-all font-medium relative group"
              whileHover={{ x: 2 }}
            >
              {item.label}
              {/* Underline animation */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-magenta-400 w-0 group-hover:w-full transition-all duration-300"
              />
            </motion.a>
          ))}
        </nav>

        {/* CTA Button - glassmorphic */}
        <motion.a
          href="#upload"
          className="group relative inline-block text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="relative overflow-hidden px-5 py-2 font-bold tracking-wide uppercase">
            {/* Glassmorphic background */}
            <div className="absolute inset-0 backdrop-blur-xl border border-white/20 rounded-lg bg-gradient-to-r from-purple-600/80 via-magenta-600/80 to-purple-700/80" />

            {/* Gradient overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-magenta-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
            />

            {/* Glow */}
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-magenta-600 rounded-lg opacity-0 group-hover:opacity-40 blur transition-opacity -z-10"
            />

            <span className="relative text-white">Start</span>
          </div>
        </motion.a>
      </div>
    </motion.header>
  );
}
