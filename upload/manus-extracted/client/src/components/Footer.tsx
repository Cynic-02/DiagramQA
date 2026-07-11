import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 backdrop-blur-xl overflow-hidden">
      {/* Glassmorphic background */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/85 to-background/75" />

      {/* Animated gradient accent */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative px-4 md:px-8 lg:px-16 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Main footer content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/manus-storage/ar2-logo_0a6289ce.png"
                  alt="AR2"
                  className="w-6 h-6"
                />
                <span className="font-black text-lg text-foreground">AR2</span>
              </div>
              <p className="text-sm text-gray-400 font-light leading-relaxed">
                Transform diagrams into verified assessment questions with AI-powered intelligence.
              </p>
            </motion.div>

            {/* Product */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="font-black text-sm mb-4 text-foreground">Product</h4>
              <ul className="space-y-3 text-sm">
                {['Features', 'Pricing', 'Documentation', 'API'].map((item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      className="text-gray-400 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-magenta-400 hover:bg-clip-text transition-all font-light"
                      whileHover={{ x: 4 }}
                    >
                      {item}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Company */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h4 className="font-black text-sm mb-4 text-foreground">Company</h4>
              <ul className="space-y-3 text-sm">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      className="text-gray-400 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-magenta-400 hover:bg-clip-text transition-all font-light"
                      whileHover={{ x: 4 }}
                    >
                      {item}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Legal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h4 className="font-black text-sm mb-4 text-foreground">Legal</h4>
              <ul className="space-y-3 text-sm">
                {['Privacy', 'Terms', 'Security', 'Cookies'].map((item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      className="text-gray-400 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-magenta-400 hover:bg-clip-text transition-all font-light"
                      whileHover={{ x: 4 }}
                    >
                      {item}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Bottom section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <motion.p
              className="text-sm text-gray-400 font-light"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              © {currentYear} AR2 DDCQG. All rights reserved.
            </motion.p>

            {/* Social icons */}
            <motion.div
              className="flex gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              {[
                { icon: Github, href: '#' },
                { icon: Twitter, href: '#' },
                { icon: Linkedin, href: '#' },
                { icon: Mail, href: '#' },
              ].map((social, i) => (
                <motion.a
                  key={i}
                  href={social.href}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-magenta-400 hover:bg-clip-text hover:border-purple-400/50 transition-all backdrop-blur-xl"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
