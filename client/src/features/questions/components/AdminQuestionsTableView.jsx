import { useState, memo } from 'react';
import MathText from '@/features/questions/components/MathText';
import Icon, {
  Check,
  Copy,
  CheckCircle2,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Layers,
  Image as ImageIcon
} from '@/shared/components/Icon';

const DIFFICULTY_STYLES = {
  easy: 'bg-status-aligned/15 text-status-aligned border-status-aligned/40',
  medium: 'bg-status-weak/15 text-status-weak border-status-weak/40',
  hard: 'bg-error/15 text-error border-error/40',
};

const TableRow = memo(function TableRow({
  q,
  isSelected,
  onToggleSelect,
  onEdit,
  onClone,
  onDelete,
  onToggleVerify
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const diff = (q.difficulty || 'medium').toLowerCase();
  const diffStyle = DIFFICULTY_STYLES[diff] || 'bg-surface-dim text-on-surface-variant border-outline-variant';

  const handleCopyId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(q.id || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleVerifyClick = async (e) => {
    e.stopPropagation();
    setToggling(true);
    try {
      await onToggleVerify(q.id, !q.verified);
    } finally {
      setToggling(false);
    }
  };

  const hasSolution = Boolean(q.solution_text && q.solution_text.trim());
  const optionsList = ['A', 'B', 'C', 'D'];

  // Syllabus labels
  const topicName = q.topics?.name || 'Unassigned';
  const chapterName = q.topics?.chapters?.name || '';
  const subjectName = q.topics?.chapters?.subjects?.name || '';

  // Extract a clean excerpt of the question text
  const stemExcerpt = (q.question_text || q.text || '').replace(/\s+/g, ' ');

  return (
    <>
      <tr
        className={`border-b border-outline-variant text-xs font-mono transition-colors ${
          isSelected
            ? 'bg-primary/10 hover:bg-primary/15'
            : 'hover:bg-surface-dim/80 bg-surface-container'
        }`}
      >
        {/* Selection Checkbox */}
        <td className="py-2.5 px-3 w-10 text-center">
          <input
            type="checkbox"
            checked={Boolean(isSelected)}
            onChange={() => onToggleSelect(q.id)}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
        </td>

        {/* Expand Toggle */}
        <td className="py-2.5 px-2 w-8 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-white/60 hover:text-primary transition-colors cursor-pointer"
            title={expanded ? 'Collapse preview' : 'Expand full question & solution'}
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>

        {/* ID & Meta */}
        <td className="py-2.5 px-3 max-w-[140px] truncate">
          <div className="flex items-center gap-1.5">
            <span
              className="text-white font-semibold cursor-pointer hover:text-primary transition-colors text-[11px]"
              onClick={handleCopyId}
              title={`Click to copy: ${q.id}`}
            >
              {q.canonical_question_id || (q.id ? q.id.slice(0, 8) + '…' : '')}
            </span>
            {copied ? (
              <Check className="w-3 h-3 text-status-aligned shrink-0" />
            ) : (
              <Copy
                className="w-3 h-3 text-white/40 hover:text-primary transition-colors cursor-pointer shrink-0"
                onClick={handleCopyId}
              />
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-white/50">
            {q.source_type && <span>{q.source_type}</span>}
            {q.exam_year && <span>• {q.exam_year}</span>}
          </div>
        </td>

        {/* Syllabus / Topic */}
        <td className="py-2.5 px-3 max-w-[150px]">
          <div className="truncate text-white/90 text-[11px]" title={`${subjectName} > ${chapterName} > ${topicName}`}>
            {topicName}
          </div>
          {chapterName && (
            <div className="truncate text-[10px] text-white/50" title={chapterName}>
              {chapterName}
            </div>
          )}
        </td>

        {/* Question Stem Excerpt */}
        <td
          className="py-2.5 px-3 max-w-xs sm:max-w-sm truncate cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          title="Click to view full math equations & choices"
        >
          <span className="text-white/90 text-[11px] font-normal leading-relaxed">
            {stemExcerpt.length > 85 ? stemExcerpt.slice(0, 85) + '…' : stemExcerpt}
          </span>
        </td>

        {/* Correct Key */}
        <td className="py-2.5 px-3 w-14 text-center">
          <span className="px-2 py-0.5 bg-status-aligned/20 text-status-aligned border border-status-aligned/40 font-bold text-[11px]">
            {q.correct_answer || '-'}
          </span>
        </td>

        {/* Solution Indicator */}
        <td className="py-2.5 px-3 w-28 text-center">
          {hasSolution ? (
            <span className="px-2 py-0.5 bg-primary/15 text-primary border border-primary/40 text-[10px] font-semibold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Solution</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-status-weak/15 text-status-weak border border-status-weak/40 text-[10px] font-semibold flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Missing</span>
            </span>
          )}
        </td>

        {/* Difficulty */}
        <td className="py-2.5 px-3 w-20 text-center">
          <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${diffStyle}`}>
            {q.difficulty || 'medium'}
          </span>
        </td>

        {/* Verified Status */}
        <td className="py-2.5 px-3 w-24 text-center">
          <button
            type="button"
            onClick={handleVerifyClick}
            disabled={toggling}
            title="Toggle Live / Draft"
            className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 w-full ${
              q.verified
                ? 'bg-status-aligned/15 text-status-aligned border-status-aligned/40 hover:bg-status-aligned/25'
                : 'bg-error/15 text-error border-error/40 hover:bg-error/25'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${q.verified ? 'bg-status-aligned' : 'bg-error'}`} />
            <span>{q.verified ? 'Live' : 'Draft'}</span>
          </button>
        </td>

        {/* Actions */}
        <td className="py-2.5 px-3 w-28 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(q)}
              className="p-1.5 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
              title="Edit question"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onClone(q)}
              className="p-1.5 bg-white/5 border border-white/20 text-white/80 hover:border-primary hover:text-primary transition-colors cursor-pointer"
              title="Clone / Author variant"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(q.id)}
              className="p-1.5 border border-error/40 text-error hover:bg-error hover:text-white transition-colors cursor-pointer"
              title="Delete question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Accordion Sub-View */}
      {expanded && (
        <tr className="border-b border-primary/40 bg-black/60">
          <td colSpan={10} className="p-4 sm:p-5">
            <div className="border border-white/10 p-4 space-y-4 text-left relative">
              <span className="absolute top-3 right-3 w-2 h-2 bg-primary" />
              {/* Question Text */}
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-mono font-bold block mb-1">
                  Full Question Text
                </span>
                <div className="text-body-md text-on-surface font-light leading-relaxed">
                  <MathText text={q.question_text || q.text || ''} />
                </div>
              </div>

              {/* Optional Diagram */}
              {q.diagram_url && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono block mb-1">
                    Attached Diagram
                  </span>
                  <div className="max-w-md border border-outline-variant p-2 bg-white/5">
                    <img
                      src={q.diagram_url}
                      alt="Question Diagram"
                      className="max-h-56 object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Options Grid */}
              {q.options && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-primary font-mono font-bold block mb-2">
                    Choices & Answer Key
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {optionsList.map((letter) => {
                      const optionText = Array.isArray(q.options)
                        ? q.options.find(o => o.id === letter)?.text
                        : (q.options?.[letter] ?? q.options?.[letter.toLowerCase()]);
                      if (!optionText) return null;
                      const isCorrect = q.correct_answer === letter;
                      return (
                        <div
                          key={letter}
                          className={`flex items-start gap-3 px-3 py-2 border text-xs font-mono transition-colors ${
                            isCorrect
                              ? 'border-status-aligned bg-status-aligned/10 text-status-aligned'
                              : 'border-outline-variant bg-surface-dim text-on-surface'
                          }`}
                        >
                          <span className={`font-bold shrink-0 mt-0.5 ${isCorrect ? 'text-status-aligned' : 'text-on-surface-variant'}`}>
                            {letter}.
                          </span>
                          <div className="font-light flex-1">
                            <MathText text={String(optionText)} />
                          </div>
                          {isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-status-aligned shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step-by-Step Solution */}
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-mono font-bold block mb-1">
                  Step-by-Step Solution
                </span>
                {hasSolution ? (
                  <div className="p-3.5 bg-status-aligned/5 border border-status-aligned/30">
                    <div className="text-body-md text-on-surface font-light leading-relaxed">
                      <MathText text={q.solution_text} />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-status-weak/10 border border-status-weak/30 flex items-center justify-between gap-3 text-xs font-mono text-status-weak">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>No step-by-step solution has been provided for this question.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(q)}
                      className="px-3 py-1 bg-status-weak/20 border border-status-weak text-status-weak hover:bg-status-weak hover:text-black transition-colors font-bold uppercase tracking-wider text-[10px] shrink-0 cursor-pointer"
                    >
                      + Add Solution
                    </button>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

export default function AdminQuestionsTableView({
  questions = [],
  selectedQuestionIds = [],
  onToggleSelect,
  onSelectAll,
  allSelected = false,
  onEdit,
  onClone,
  onDelete,
  onToggleVerify
}) {
  return (
    <div className="border border-outline-variant bg-surface-container overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-white/20 bg-surface-dim text-white/60 font-mono text-[11px] uppercase tracking-wider">
            <th className="py-3 px-3 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="w-4 h-4 accent-primary cursor-pointer"
                title="Select all on this page"
              />
            </th>
            <th className="py-3 px-2 w-8 text-center" title="Expand Details"></th>
            <th className="py-3 px-3 max-w-[140px]">ID / Year</th>
            <th className="py-3 px-3 max-w-[150px]">Topic</th>
            <th className="py-3 px-3">Question Stem</th>
            <th className="py-3 px-3 w-14 text-center">Key</th>
            <th className="py-3 px-3 w-28 text-center">Solution</th>
            <th className="py-3 px-3 w-20 text-center">Diff</th>
            <th className="py-3 px-3 w-24 text-center">Status</th>
            <th className="py-3 px-3 w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <TableRow
              key={q.id}
              q={q}
              isSelected={selectedQuestionIds.includes(q.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onClone={onClone}
              onDelete={onDelete}
              onToggleVerify={onToggleVerify}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
