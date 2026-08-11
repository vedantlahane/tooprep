import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderLatex(text) {
  if (!text) return '';

  // Replace display math $$...$$ first
  let result = text.replace(/\$\$(.*?)\$\$/gs, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    } catch { return math; }
  });

  // Replace inline math $...$
  result = result.replace(/\$(.*?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch { return math; }
  });

  // Replace \(...\) inline
  result = result.replace(/\\\((.*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch { return math; }
  });

  // Replace \[...\] display
  result = result.replace(/\\\[(.*?)\\\]/gs, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    } catch { return math; }
  });

  return result;
}

export function MathText({ text, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && text) {
      ref.current.innerHTML = renderLatex(text);
    }
  }, [text]);

  return <span ref={ref} className={className} />;
}

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

  const options = typeof question.options === 'string'
    ? JSON.parse(question.options)
    : question.options;

  const getOptionStyle = (optionId) => {
    const isSelected = selectedAnswer === optionId;
    const isCorrect = question.correct_answer === optionId;

    if (showResult) {
      if (isCorrect) return 'bg-tertiary-container/10 border-tertiary-container text-on-surface ring-2 ring-tertiary-container';
      if (isSelected && !isCorrect) return 'bg-error-container/20 border-error text-on-surface ring-2 ring-error';
      return 'bg-surface-container-lowest border-outline-variant/50 text-on-surface-variant';
    }

    if (isSelected) return 'bg-primary-fixed border-primary text-on-surface ring-2 ring-primary';
    return 'bg-surface-container-lowest border-outline-variant/50 text-on-surface hover:border-primary/50 hover:bg-surface-container-low';
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 md:p-6 animate-fade-in">
      {/* Question header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {questionNumber && (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-on-primary text-label-mono font-bold">
              {questionNumber}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-label-sm-mono px-2 py-0.5 rounded border-l-2 ${
              question.difficulty === 'easy' ? 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container' :
              question.difficulty === 'medium' ? 'bg-status-weak/10 text-status-weak border-status-weak' :
              'bg-error-container/20 text-error border-error'
            }`}>
              {question.difficulty?.toUpperCase()}
            </span>
            {question.source_type === 'PYQ' && (
              <span className="text-label-sm-mono px-2 py-0.5 rounded bg-primary-fixed text-primary border-l-2 border-primary">
                PYQ {question.exam_year || ''}
              </span>
            )}
          </div>
        </div>
        {onMarkForReview && (
          <button
            onClick={onMarkForReview}
            className={`p-1.5 rounded-lg transition-colors ${
              markedForReview
                ? 'text-status-weak bg-status-weak/10'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className={`material-symbols-outlined ${markedForReview ? 'filled' : ''}`}>
              bookmark
            </span>
          </button>
        )}
      </div>

      {/* Question text */}
      <div className="text-body-lg text-on-surface mb-5 leading-relaxed">
        <MathText text={question.question_text} />
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {options.map(opt => (
          <button
            key={opt.id}
            disabled={disabled || showResult}
            onClick={() => onSelectAnswer && onSelectAnswer(opt.id)}
            className={`w-full text-left p-3.5 rounded-lg border-2 transition-all duration-150 flex items-start gap-3 ${getOptionStyle(opt.id)} ${
              disabled || showResult ? '' : 'cursor-pointer active:scale-[0.99]'
            }`}
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-surface-container text-label-mono font-bold text-on-surface-variant flex-shrink-0 mt-0.5">
              {opt.id}
            </span>
            <span className="text-body-md flex-1">
              <MathText text={opt.text} />
            </span>
            {showResult && question.correct_answer === opt.id && (
              <span className="material-symbols-outlined text-tertiary-container flex-shrink-0">check_circle</span>
            )}
            {showResult && selectedAnswer === opt.id && selectedAnswer !== question.correct_answer && (
              <span className="material-symbols-outlined text-error flex-shrink-0">cancel</span>
            )}
          </button>
        ))}
      </div>

      {/* Solution */}
      {showSolution && question.solution_text && (
        <div className="mt-5 p-4 rounded-lg bg-[#F0F7FF] border border-primary-fixed">
          <div className="text-label-sm-mono text-primary font-bold mb-2">SOLUTION</div>
          <div className="text-body-md text-on-surface leading-relaxed">
            <MathText text={question.solution_text} />
          </div>
        </div>
      )}
    </div>
  );
}
