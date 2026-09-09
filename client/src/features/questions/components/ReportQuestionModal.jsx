import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { questionsService } from '../services/questionsService';

const REPORT_REASONS = [
  { id: 'WRONG_ANSWER', label: 'Wrong Answer Key', desc: 'The marked correct answer is incorrect' },
  { id: 'MATH_ERROR', label: 'Math / Calculation Error', desc: 'Mistake in question formulation, values, or solution steps' },
  { id: 'MISSING_DIAGRAM', label: 'Missing / Broken Diagram', desc: 'Diagram is missing, clipped, or unreadable' },
  { id: 'MISCLASSIFIED', label: 'Wrong Topic / Chapter', desc: 'Question belongs to another subject, chapter, or topic' },
  { id: 'TYPO', label: 'Typo / Formatting', desc: 'KaTeX syntax glitch, layout issue, or unclear wording' },
  { id: 'OTHER', label: 'Other Issue', desc: 'Any other problem with this question' },
];

export default function ReportQuestionModal({
  isOpen,
  question,
  onClose
}) {
  const [reason, setReason] = useState('WRONG_ANSWER');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !question) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason category');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await questionsService.reportQuestion(question.id, { reason, notes });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setNotes('');
        onClose();
      }, 1600);
    } catch (err) {
      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (submitting) return;
    setError('');
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-lg bg-[#0F1318] border border-white/15 rounded-md shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xs bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Flag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">Report Question Issue</h3>
                <p className="text-xs font-mono text-white/50">
                  ID: {question.id?.slice(0, 16) || 'N/A'}...
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleModalClose}
              className="p-1 text-white/50 hover:text-white rounded-xs hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-status-aligned/20 border border-status-aligned flex items-center justify-center text-status-aligned">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-medium text-white">Report Submitted</h4>
                <p className="text-sm text-white/60 max-w-xs">
                  Thank you for flagging this question. Our content ops team will verify and resolve it promptly.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-error/15 border border-error/40 text-error text-xs rounded-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2.5">
                    What is the issue?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REPORT_REASONS.map((r) => {
                      const isSelected = reason === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setReason(r.id)}
                          className={`p-3 text-left border rounded-xs transition-all flex flex-col gap-0.5 cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-white ring-1 ring-primary/40'
                              : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-semibold">{r.label}</span>
                          <span className="text-[11px] text-white/40 leading-snug">{r.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    Details / Correction Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Correct answer should be Option C because... or formula on line 2 has a sign error"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 focus:border-primary focus:outline-none rounded-xs text-sm text-white placeholder-white/30 font-light resize-none transition-colors"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white border border-white/10 hover:border-white/25 rounded-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-mono uppercase tracking-wider bg-amber-500 text-black font-bold hover:bg-amber-400 rounded-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5 fill-current" />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
