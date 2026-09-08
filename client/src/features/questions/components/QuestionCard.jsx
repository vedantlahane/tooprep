import { Bookmark, Check, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';

export { MathText };

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  showSolution = false,
  disabled = false,
  questionNumber = null,
  markedForReview = false,
  onMarkForReview = null
}) {
  if (!question) return null;

  const rawOptions = typeof question.options === 'string'
    ? (() => { try { return JSON.parse(question.options); } catch { return []; } })()
    : question.options;

  // BUG 14 FIX: Normalize option lookup to handle both uppercase {A,B,C,D} and lowercase {a,b,c,d} keys
  // from the database. Always coerce the text value to a string so opt.text is never undefined.
  const options = Array.isArray(rawOptions)
    ? rawOptions.map(opt => ({ ...opt, text: String(opt.text ?? '') }))
    : rawOptions && typeof rawOptions === 'object'
      ? ['A', 'B', 'C', 'D'].map(id => ({
          id,
          text: String(
            rawOptions[id] ??
            rawOptions[id.toLowerCase()] ??
            rawOptions[id.toUpperCase()] ??
            ''
          )
        }))
      : [];

  const getOptionStyle = (optionId) => {
    const isSelected = selectedAnswer === optionId;
    const isCorrect = question.correct_answer === optionId;

    if (showResult) {
      if (isCorrect) {
        return 'bg-status-aligned/15 border-status-aligned text-white ring-1 ring-status-aligned/50 shadow-md shadow-status-aligned/10';
      }
      if (isSelected && !isCorrect) {
        return 'bg-error/15 border-error text-white ring-1 ring-error/50 shadow-md shadow-error/10';
      }
      return 'bg-surface-container/40 border-white/5 text-white/40';
    }

    if (isSelected) {
      return 'bg-primary text-black font-semibold border-primary shadow-sm';
    }
    return 'bg-white/[0.03] border-white/10 hover:border-primary/60 text-white hover:bg-white/[0.08]';
  };

  const getLetterBadgeStyle = (optionId) => {
    const isSelected = selectedAnswer === optionId;
    const isCorrect = question.correct_answer === optionId;

    if (showResult) {
      if (isCorrect) return 'bg-status-aligned text-black font-bold';
      if (isSelected && !isCorrect) return 'bg-error text-white font-bold';
      return 'bg-white/5 text-white/40 border border-white/10';
    }

    if (isSelected) {
      return 'bg-black/25 text-black font-bold';
    }
    return 'bg-black/30 border border-white/15 text-primary font-bold';
  };

  // BUG 15 FIX: Strip LaTeX delimiters and commands before measuring text length for layout detection.
  // Without this, short math options like "$\frac{3}{4}$" (18 chars of LaTeX) would measure as 18
  // when the rendered content is just "3/4" — forcing single-column layout unnecessarily.
  const areOptionsShort = options.length > 0 && options.every(opt => {
    const t = opt.text.trim();
    // Strip LaTeX math delimiters and command tokens to approximate rendered length
    const visibleText = t
      .replace(/\$\$[\s\S]*?\$\$/g, 'X')          // $$...$$ display math → single char
      .replace(/\$[^\n$]*?\$/g, 'X')               // $...$ inline math → single char
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, 'X')       // \cmd{arg} → single char
      .replace(/\\[a-zA-Z]+/g, 'X')                // \cmd → single char
      .replace(/\{[^}]*\}/g, '')                    // bare {arg} → empty
      .replace(/\s+/g, ' ')
      .trim();
    return visibleText.length <= 45 && !t.includes('\n') && !t.includes('![');
  });

  return (
    <div className="w-full max-w-4xl animate-slide-up space-y-6 text-left">
      {/* Question header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          {questionNumber && (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-primary text-black font-bold text-sm shadow-sm">
              {questionNumber}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-xs uppercase tracking-wider font-bold border ${
              question.difficulty === 'easy'
                ? 'bg-status-aligned/15 text-status-aligned border-status-aligned/30'
                : question.difficulty === 'medium'
                ? 'bg-status-weak/15 text-status-weak border-status-weak/30'
                : 'bg-error/15 text-error border-error/30'
            }`}>
              {question.difficulty}
            </span>
            {question.source_type === 'PYQ' && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-xs bg-primary/10 text-primary border border-primary/30 uppercase tracking-wider">
                PYQ {question.exam_year || ''}
              </span>
            )}
          </div>
        </div>

        {onMarkForReview && (
          <button
            type="button"
            onClick={onMarkForReview}
            className={`p-2 transition-all rounded-sm border cursor-pointer ${
              markedForReview
                ? 'border-[#FF9500] text-[#FF9500] bg-[#FF9500]/15'
                : 'border-white/10 text-white/50 hover:text-white hover:border-white/30 bg-white/5'
            }`}
            title="Mark for Review"
          >
            <Bookmark className={`w-4 h-4 ${markedForReview ? 'fill-current text-[#FF9500]' : ''}`} />
          </button>
        )}
      </div>

      {/* Question stem */}
      <div className="text-xl md:text-2xl font-light text-white leading-relaxed tracking-tight py-1">
        <MathText text={question.question_text} />
      </div>

      {/* Options - Responsive: 2-column grid for short answers, stacked for multi-line */}
      <div className={areOptionsShort ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2.5'}>
        {options.map(opt => (
          <motion.button
            key={opt.id}
            type="button"
            disabled={disabled || showResult}
            whileHover={disabled || showResult ? {} : { scale: 1.004, x: 2 }}
            whileTap={disabled || showResult ? {} : { scale: 0.996 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => onSelectAnswer && onSelectAnswer(opt.id)}
            className={`w-full text-left p-3.5 md:p-4 flex items-start gap-3.5 rounded-sm border transition-all duration-150 ${getOptionStyle(opt.id)} ${
              disabled || showResult ? '' : 'cursor-pointer'
            }`}
          >
            <span className={`inline-flex items-center justify-center w-7 h-7 text-xs rounded-xs flex-shrink-0 mt-0.5 transition-colors ${getLetterBadgeStyle(opt.id)}`}>
              {opt.id}
            </span>
            <span className="text-base md:text-lg flex-1 font-light leading-snug">
              <MathText text={opt.text} />
            </span>
            {showResult && question.correct_answer === opt.id && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="w-7 h-7 rounded-full bg-status-aligned/20 border border-status-aligned flex items-center justify-center shrink-0"
              >
                <Check className="w-4 h-4 text-status-aligned stroke-[2.5]" />
              </motion.span>
            )}
            {showResult && selectedAnswer === opt.id && selectedAnswer !== question.correct_answer && (
              <motion.span
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="w-7 h-7 rounded-full bg-error/20 border border-error flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-error stroke-[2.5]" />
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Solution with Fluid Height Transition */}
      <AnimatePresence>
        {showSolution && question.solution_text && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 p-5 md:p-6 bg-white/[0.02] border border-primary/30 space-y-3"
          >
            <div className="flex items-center gap-2 text-[11px] font-mono text-primary font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Step-by-Step LaTeX Derivation</span>
            </div>
            <div className="text-base text-white/90 leading-relaxed font-light">
              <MathText text={question.solution_text} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
