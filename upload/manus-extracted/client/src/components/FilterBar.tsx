import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import DifficultyBadge, { DifficultyLevel } from './DifficultyBadge';

export type SortOption = 'difficulty-asc' | 'difficulty-desc' | 'alphabetical' | 'verified-first';

interface FilterBarProps {
  difficulties: DifficultyLevel[];
  selectedDifficulties: DifficultyLevel[];
  onDifficultyChange: (difficulties: DifficultyLevel[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  filteredCount: number;
  showVerifiedOnly?: boolean;
  onVerifiedOnlyChange?: (verified: boolean) => void;
}

/**
 * FilterBar Component
 * Animated filter bar for sorting and filtering questions by difficulty
 */
export default function FilterBar({
  difficulties,
  selectedDifficulties,
  onDifficultyChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
  showVerifiedOnly = false,
  onVerifiedOnlyChange,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const toggleDifficulty = (difficulty: DifficultyLevel) => {
    if (selectedDifficulties.includes(difficulty)) {
      onDifficultyChange(selectedDifficulties.filter((d) => d !== difficulty));
    } else {
      onDifficultyChange([...selectedDifficulties, difficulty]);
    }
  };

  const clearFilters = () => {
    onDifficultyChange([]);
    onSortChange('difficulty-asc');
    onVerifiedOnlyChange?.(false);
  };

  const isFiltered =
    selectedDifficulties.length > 0 ||
    sortBy !== 'difficulty-asc' ||
    showVerifiedOnly;

  const sortOptions: { value: SortOption; label: string; icon: string }[] = [
    { value: 'difficulty-asc', label: 'Difficulty: Low to High', icon: '📈' },
    { value: 'difficulty-desc', label: 'Difficulty: High to Low', icon: '📉' },
    { value: 'alphabetical', label: 'Alphabetical (A-Z)', icon: '🔤' },
    { value: 'verified-first', label: 'Verified First', icon: '✓' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Main filter bar */}
      <div className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-r from-white/5 to-white/[0.02] hover:border-white/20 transition-all">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left side - Filter info */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Filter className="w-5 h-5 text-purple-400" />
            </motion.div>
            <div className="text-sm">
              <span className="text-gray-300 font-medium">
                {filteredCount}
              </span>
              <span className="text-gray-500 font-light">
                {' '}of {totalCount} questions
              </span>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Sort button */}
            <motion.div className="relative">
              <motion.button
                onClick={() => setShowSortMenu(!showSortMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-gray-300 transition-all"
              >
                <ArrowUpDown className="w-4 h-4" />
                Sort
              </motion.button>

              {/* Sort dropdown */}
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/20 rounded-xl backdrop-blur-xl shadow-2xl z-50"
                  >
                    <div className="p-2 space-y-1">
                      {sortOptions.map((option) => (
                        <motion.button
                          key={option.value}
                          onClick={() => {
                            onSortChange(option.value);
                            setShowSortMenu(false);
                          }}
                          whileHover={{ x: 4 }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            sortBy === option.value
                              ? 'bg-purple-600/50 text-purple-200 border border-purple-500/50'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="mr-2">{option.icon}</span>
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Verified only toggle */}
            {onVerifiedOnlyChange && (
              <motion.button
                onClick={() => onVerifiedOnlyChange(!showVerifiedOnly)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  showVerifiedOnly
                    ? 'bg-green-600/50 text-green-200 border-green-500/50'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-300'
                }`}
              >
                ✓ Verified
              </motion.button>
            )}

            {/* Clear filters button */}
            <AnimatePresence>
              {isFiltered && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearFilters}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-xs font-semibold text-red-300 transition-all"
                >
                  <X className="w-4 h-4" />
                  Clear
                </motion.button>
              )}
            </AnimatePresence>

            {/* Expand button */}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-gray-300 transition-all"
            >
              {isExpanded ? 'Hide' : 'Filter'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Expanded filter options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-r from-white/5 to-white/[0.02] space-y-4"
          >
            {/* Difficulty filters */}
            <div className="space-y-3">
              <p className="text-xs font-black text-gray-300 uppercase tracking-wider">
                Filter by Difficulty
              </p>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((difficulty, index) => (
                  <motion.button
                    key={difficulty}
                    onClick={() => toggleDifficulty(difficulty)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      selectedDifficulties.includes(difficulty)
                        ? 'bg-purple-600/50 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-500/20'
                        : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-300'
                    }`}
                  >
                    {difficulty}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Filter info */}
            {selectedDifficulties.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-purple-600/20 border border-purple-500/30 text-xs text-purple-200"
              >
                <span className="font-semibold">Active filters:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDifficulties.map((difficulty) => (
                    <motion.span
                      key={difficulty}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-600/50 border border-purple-500/50"
                    >
                      {difficulty}
                      <button
                        onClick={() => toggleDifficulty(difficulty)}
                        className="ml-1 hover:text-purple-100"
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
