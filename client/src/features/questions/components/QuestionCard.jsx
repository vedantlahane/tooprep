import { Bookmark, Check, X } from 'lucide-react';
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

  const options = Array.isArray(rawOptions)
    ? rawOptions
    : rawOptions && typeof rawOptions === 'object'
      ? ['A', 'B', 'C', 'D'].map(id => ({ id, text: rawOptions[id] ?? rawOptions[id.toLowerCase()] ?? '' }))
      : [];

  const getOptionStyle = (optionId) => {
    const isSelected = selectedAnswer === optionId;
    const isCorrect = question.correct_answer === optionId;

    if (showResult) {
      if (isCorrect) return 'bg-status-aligned text-white border-2 border-status-aligned';
      if (isSelected && !isCorrect) return 'bg-error text-white border-2 border-error';
      return 'bg-surface-container-high border-2 border-transparent text-on-surface-variant';
    }

    if (isSelected) return 'bg-primary text-white border-2 border-primary';
    return 'bg-surface-container-high border-2 border-transparent text-on-surface hover:border-outline-variant';
  };

  return (
    <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8 animate-fade-in">
      {/* Question header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {questionNumber && (
            <span className="inline-flex items-center justify-center w-10 h-10 bg-primary text-white text-headline-md font-light">
              {questionNumber}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-label-sm-mono px-2 py-1 uppercase tracking-widest ${
              question.difficulty === 'easy' ? 'bg-status-aligned/20 text-status-aligned' :
              question.difficulty === 'medium' ? 'bg-status-weak/20 text-status-weak' :
              'bg-error/20 text-error'
            }`}>
              {question.difficulty}
            </span>
            {question.source_type === 'PYQ' && (
              <span className="text-label-sm-mono px-2 py-1 bg-primary/20 text-primary uppercase tracking-widest">
                PYQ {question.exam_year || ''}
              </span>
            )}
          </div>
        </div>
        {onMarkForReview && (
          <button
            onClick={onMarkForReview}
            className={`p-2 transition-colors border-2 ${
              markedForReview
                ? 'border-status-weak text-status-weak bg-status-weak/10'
                : 'border-transparent text-on-surface-variant hover:border-outline-variant'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${markedForReview ? 'fill-current text-status-weak' : ''}`} />
          </button>
        )}
      </div>

      {/* Question text */}
      <div className="text-headline-md font-light text-on-surface mb-8 leading-relaxed">
        <MathText text={question.question_text} />
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map(opt => (
          <button
            key={opt.id}
            disabled={disabled || showResult}
            onClick={() => onSelectAnswer && onSelectAnswer(opt.id)}
            className={`w-full text-left p-4 transition-all duration-150 flex items-start gap-4 ${getOptionStyle(opt.id)} ${
              disabled || showResult ? '' : 'cursor-pointer active:scale-[0.98]'
            }`}
          >
            <span className="inline-flex items-center justify-center w-8 h-8 bg-black/20 text-body-lg font-bold flex-shrink-0 mt-0.5">
              {opt.id}
            </span>
            <span className="text-body-lg flex-1">
              <MathText text={opt.text} />
            </span>
            {showResult && question.correct_answer === opt.id && (
              <Check className="w-5 h-5 flex-shrink-0 text-white" />
            )}
            {showResult && selectedAnswer === opt.id && selectedAnswer !== question.correct_answer && (
              <X className="w-5 h-5 flex-shrink-0 text-white" />
            )}
          </button>
        ))}
      </div>

      {/* Solution */}
      {showSolution && question.solution_text && (
        <div className="mt-8 p-6 bg-primary/10 border-l-4 border-primary">
          <div className="text-label-sm-mono text-primary font-bold mb-3 tracking-widest uppercase">solution</div>
          <div className="text-body-lg text-on-surface leading-relaxed font-light">
            <MathText text={question.solution_text} />
          </div>
        </div>
      )}
    </div>
  );
}
