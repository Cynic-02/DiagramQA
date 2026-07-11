import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Download, Copy, CheckCircle2, AlertCircle, Share2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import DifficultyBadge, { DifficultyLevel } from './DifficultyBadge';
import FilterBar, { SortOption } from './FilterBar';

export interface QuestionAnswerPair {
  id: string;
  question: string;
  answer: string;
  difficulty: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  verified: boolean;
  ambiguities?: string[];
}

interface ResultsViewProps {
  pairs: QuestionAnswerPair[];
  diagramName?: string;
  onExport?: () => void;
}

function QAPair({ pair, index }: { pair: QuestionAnswerPair; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `Q: ${pair.question}\n\nA: ${pair.answer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="group relative rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-primary/50 transition-all duration-300"
      whileHover={{ y: -4 }}
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-start gap-4 hover:bg-white/5 transition-colors text-left relative z-10"
      >
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-3 flex-wrap">
            <DifficultyBadge level={pair.difficulty as any} delay={index * 0.05} />
            {pair.verified && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-1 rounded-full"
              >
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </motion.span>
            )}
          </div>
          <p className="text-foreground font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {pair.question}
          </p>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] relative z-10"
          >
            <div className="p-6 space-y-6">
              {/* Question */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Question
                </p>
                <p className="text-foreground leading-relaxed text-base">
                  {pair.question}
                </p>
              </div>

              {/* Answer */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Answer
                </p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10 backdrop-blur-sm"
                >
                  <p className="text-foreground leading-relaxed font-mono text-sm">
                    {pair.answer}
                  </p>
                </motion.div>
              </div>

              {/* Ambiguities */}
              {pair.ambiguities && pair.ambiguities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-400 mb-2">Potential Issues</p>
                      <ul className="text-sm text-amber-300/90 space-y-1">
                        {pair.ambiguities.map((ambiguity, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-amber-400">•</span>
                            <span>{ambiguity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 pt-2"
              >
                <motion.button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </motion.button>
                <motion.button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResultsView({ pairs, diagramName, onExport }: ResultsViewProps) {
  const [selectedDifficulties, setSelectedDifficulties] = useState<DifficultyLevel[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('difficulty-asc');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  // Get unique difficulties from pairs
  const difficulties: DifficultyLevel[] = [
    'Remember',
    'Understand',
    'Apply',
    'Analyze',
    'Evaluate',
    'Create',
  ];

  // Filter and sort pairs
  const filteredAndSortedPairs = useMemo(() => {
    let filtered = pairs;

    // Apply difficulty filter
    if (selectedDifficulties.length > 0) {
      filtered = filtered.filter((p) => selectedDifficulties.includes(p.difficulty));
    }

    // Apply verified filter
    if (showVerifiedOnly) {
      filtered = filtered.filter((p) => p.verified);
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'difficulty-asc':
        sorted.sort((a, b) => difficulties.indexOf(a.difficulty) - difficulties.indexOf(b.difficulty));
        break;
      case 'difficulty-desc':
        sorted.sort((a, b) => difficulties.indexOf(b.difficulty) - difficulties.indexOf(a.difficulty));
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.question.localeCompare(b.question));
        break;
      case 'verified-first':
        sorted.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
        break;
    }

    return sorted;
  }, [pairs, selectedDifficulties, sortBy, showVerifiedOnly]);

  const verifiedCount = pairs.filter((p) => p.verified).length;
  const difficultyDistribution = pairs.reduce(
    (acc, p) => {
      acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          className="flex items-start justify-between gap-4 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Results
            </h2>
            {diagramName && (
              <p className="text-muted-foreground">
                From: <span className="font-semibold text-foreground">{diagramName}</span>
              </p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Questions', value: pairs.length, color: 'from-primary/20 to-primary/5' },
            { label: 'Verified', value: verifiedCount, color: 'from-green-500/20 to-green-500/5' },
            { label: 'Difficulty Levels', value: Object.keys(difficultyDistribution).length, color: 'from-cyan-500/20 to-cyan-500/5' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 bg-gradient-to-br ${stat.color} border border-white/10 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all`}
              whileHover={{ y: -4 }}
            >
              <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
              <motion.p
                className="text-4xl font-bold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {stat.value}
              </motion.p>
            </motion.div>
          ))}
        </div>

        {/* Difficulty distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl"
        >
          <p className="text-sm font-semibold text-foreground mb-4">Difficulty Distribution</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(difficultyDistribution).map(([difficulty, count], i) => (
              <motion.div
                key={difficulty}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2"
              >
                <DifficultyBadge level={difficulty as any} delay={i * 0.05} />
                <span className="text-sm text-muted-foreground font-medium">({count})</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Filter bar */}
        <FilterBar
          difficulties={difficulties}
          selectedDifficulties={selectedDifficulties}
          onDifficultyChange={setSelectedDifficulties}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={pairs.length}
          filteredCount={filteredAndSortedPairs.length}
          showVerifiedOnly={showVerifiedOnly}
          onVerifiedOnlyChange={setShowVerifiedOnly}
        />

        {/* Q&A pairs */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground">
            Question & Answer Pairs
            {filteredAndSortedPairs.length !== pairs.length && (
              <span className="text-sm text-gray-400 font-light ml-2">
                ({filteredAndSortedPairs.length})
              </span>
            )}
          </h3>
          <AnimatePresence mode="popLayout">
            {filteredAndSortedPairs.length > 0 ? (
              <motion.div className="space-y-4">
                {filteredAndSortedPairs.map((pair, index) => (
                  <QAPair key={pair.id} pair={pair} index={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] text-center"
              >
                <p className="text-gray-400 font-light">No questions match your filters.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
