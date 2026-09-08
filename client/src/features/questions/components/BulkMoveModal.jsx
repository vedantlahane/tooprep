import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon, { X, ArrowRight, Layers, CheckCircle2 } from '@/shared/components/Icon';

export default function BulkMoveModal({
  isOpen,
  selectedCount = 0,
  hierarchy = [],
  initialTopicId = '',
  onClose,
  onConfirm
}) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [targetTopicId, setTargetTopicId] = useState('');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setMoving(false);
    if (initialTopicId && hierarchy.length > 0) {
      for (const s of hierarchy) {
        for (const c of (s.chapters || [])) {
          for (const t of (c.topics || [])) {
            if (t.id === initialTopicId) {
              setSelectedSubject(s.id || s.name);
              setSelectedChapter(c.id || c.name);
              setTargetTopicId(t.id);
              return;
            }
          }
        }
      }
    }
  }, [isOpen, initialTopicId, hierarchy]);

  const subjects = hierarchy;
  const chapters = selectedSubject
    ? (hierarchy.find(s => s.id === selectedSubject || s.name === selectedSubject)?.chapters || [])
    : [];
  const topics = selectedChapter
    ? (chapters.find(c => c.id === selectedChapter || c.name === selectedChapter)?.topics || [])
    : [];

  const handleSubjectChange = (val) => {
    setSelectedSubject(val);
    setSelectedChapter('');
    setTargetTopicId('');
  };

  const handleChapterChange = (val) => {
    setSelectedChapter(val);
    setTargetTopicId('');
  };

  const handleExecuteMove = async () => {
    if (!targetTopicId) {
      setError('Please select a destination topic.');
      return;
    }
    setMoving(true);
    setError('');
    try {
      await onConfirm(targetTopicId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to move questions.');
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-surface-dim border-2 border-primary shadow-2xl p-6 space-y-6 text-left"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest font-bold">
                <Layers className="w-4 h-4 text-primary" />
                <span>Bulk Topic Reassignment</span>
              </div>
              <h2 className="text-xl font-light text-white mt-1">
                Move {selectedCount} Question{selectedCount !== 1 ? 's' : ''}
              </h2>
              <p className="text-xs text-white/50 font-mono mt-0.5">
                Reassign the syllabus placement for all currently selected questions.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-error/15 border-l-4 border-error text-error text-xs font-mono">
              {error}
            </div>
          )}

          {/* Curriculum Selectors */}
          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-white/60 uppercase tracking-widest mb-1.5">
                1. Target Subject
              </label>
              <select
                value={selectedSubject}
                onChange={e => handleSubjectChange(e.target.value)}
                className="w-full bg-black border border-white/15 p-2.5 text-white outline-none focus:border-primary"
              >
                <option value="">Select Target Subject...</option>
                {subjects.map(s => (
                  <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 uppercase tracking-widest mb-1.5">
                2. Target Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={e => handleChapterChange(e.target.value)}
                disabled={!selectedSubject}
                className="w-full bg-black border border-white/15 p-2.5 text-white outline-none focus:border-primary disabled:opacity-40"
              >
                <option value="">Select Target Chapter...</option>
                {chapters.map(c => (
                  <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 uppercase tracking-widest mb-1.5">
                3. Target Topic
              </label>
              <select
                value={targetTopicId}
                onChange={e => setTargetTopicId(e.target.value)}
                disabled={!selectedChapter}
                className="w-full bg-black border border-white/15 p-2.5 text-white outline-none focus:border-primary disabled:opacity-40"
              >
                <option value="">Select Target Topic...</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Confirmation Summary */}
          {targetTopicId && (
            <div className="p-3 bg-primary/10 border border-primary/30 flex items-center gap-2 text-xs font-mono text-white">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>
                Questions will be moved to: <strong className="text-primary">{topics.find(t => t.id === targetTopicId)?.name}</strong>
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/20 text-white/70 hover:text-white uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={moving || !targetTopicId}
              onClick={handleExecuteMove}
              className="px-6 py-2 bg-primary text-white font-bold uppercase tracking-widest hover:brightness-110 shadow-lg disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              <span>{moving ? 'Moving Questions...' : 'Confirm Move'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
