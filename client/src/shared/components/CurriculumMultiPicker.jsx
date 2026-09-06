import React, { useState, useMemo } from 'react';
import Icon, {
  Search,
  Check,
  X,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from './Icon';

export default function CurriculumMultiPicker({
  hierarchy = [],
  selectedSubject = '',
  onSubjectChange,
  selectedChapters = [],
  onChaptersChange,
  selectedTopics = [],
  onTopicsChange,
  compact = false,
  className = ''
}) {
  const [chapterSearch, setChapterSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [showSelectedChips, setShowSelectedChips] = useState(false);

  // Available subjects
  const subjects = hierarchy;

  // Active chapters based on subject filter
  const availableChapters = useMemo(() => {
    if (!selectedSubject) {
      return hierarchy.flatMap(s => (s.chapters || []).map(c => ({ ...c, subjectName: s.name })));
    }
    const found = hierarchy.find(s => s.id === selectedSubject || s.name === selectedSubject);
    return (found?.chapters || []).map(c => ({ ...c, subjectName: found.name }));
  }, [hierarchy, selectedSubject]);

  // Filtered chapters by search query
  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return availableChapters;
    const q = chapterSearch.toLowerCase().trim();
    return availableChapters.filter(c => c.name.toLowerCase().includes(q));
  }, [availableChapters, chapterSearch]);

  // Available topics based on selected chapters (or all available chapters if none explicitly selected)
  const availableTopics = useMemo(() => {
    const chaptersInScope = selectedChapters.length > 0
      ? availableChapters.filter(c => selectedChapters.includes(c.id || c.name))
      : availableChapters;

    const list = [];
    chaptersInScope.forEach(c => {
      (c.topics || []).forEach(t => {
        list.push({
          ...t,
          chapterName: c.name,
          chapterId: c.id || c.name,
          subjectName: c.subjectName
        });
      });
    });
    return list;
  }, [availableChapters, selectedChapters]);

  // Filtered topics by search query
  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return availableTopics;
    const q = topicSearch.toLowerCase().trim();
    return availableTopics.filter(t =>
      t.name.toLowerCase().includes(q) || (t.chapterName || '').toLowerCase().includes(q)
    );
  }, [availableTopics, topicSearch]);

  // Chapter Toggle Handlers
  const handleToggleChapter = (chapter) => {
    const chapterId = chapter.id || chapter.name;
    const isSelected = selectedChapters.includes(chapterId);
    let nextChapters;
    let nextTopics = [...selectedTopics];

    if (isSelected) {
      nextChapters = selectedChapters.filter(id => id !== chapterId);
      // Remove all topics belonging to this chapter
      const chapterTopicIds = (chapter.topics || []).map(t => t.id);
      nextTopics = nextTopics.filter(id => !chapterTopicIds.includes(id));
    } else {
      nextChapters = [...selectedChapters, chapterId];
      // Add all topics belonging to this chapter
      const chapterTopicIds = (chapter.topics || []).map(t => t.id);
      chapterTopicIds.forEach(id => {
        if (!nextTopics.includes(id)) nextTopics.push(id);
      });
    }

    onChaptersChange(nextChapters);
    onTopicsChange(nextTopics);
  };

  const handleSelectAllChapters = () => {
    const allIds = availableChapters.map(c => c.id || c.name);
    const allTopicIds = availableTopics.map(t => t.id);
    onChaptersChange(allIds);
    onTopicsChange(allTopicIds);
  };

  const handleClearChapters = () => {
    onChaptersChange([]);
    onTopicsChange([]);
  };

  // Topic Toggle Handlers
  const handleToggleTopic = (topicId) => {
    if (selectedTopics.includes(topicId)) {
      onTopicsChange(selectedTopics.filter(id => id !== topicId));
    } else {
      onTopicsChange([...selectedTopics, topicId]);
    }
  };

  const handleSelectAllTopics = () => {
    const allIds = availableTopics.map(t => t.id);
    onTopicsChange(allIds);
  };

  const handleClearTopics = () => {
    onTopicsChange([]);
  };

  const handleResetAll = () => {
    onChaptersChange([]);
    onTopicsChange([]);
    setChapterSearch('');
    setTopicSearch('');
  };

  return (
    <div className={`space-y-4 text-left ${className}`}>
      {/* Subject Selector Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mr-1">Subject:</span>
        <button
          type="button"
          onClick={() => {
            onSubjectChange('');
            onChaptersChange([]);
            onTopicsChange([]);
          }}
          className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors rounded-none border ${
            !selectedSubject
              ? 'bg-primary border-primary text-black font-bold'
              : 'border-outline-variant bg-surface text-white/60 hover:text-white'
          }`}
        >
          All Subjects
        </button>
        {subjects.map(s => {
          const isSelected = selectedSubject === (s.id || s.name);
          return (
            <button
              key={s.id || s.name}
              type="button"
              onClick={() => {
                onSubjectChange(s.id || s.name);
                onChaptersChange([]);
                onTopicsChange([]);
              }}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors rounded-none border ${
                isSelected
                  ? 'bg-primary border-primary text-black font-bold'
                  : 'border-outline-variant bg-surface text-white/60 hover:text-white'
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Two Column Grid: Chapters on Left, Topics on Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Chapters Multi-Select Column ── */}
        <div className="border border-outline-variant bg-surface-container/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Chapters
              </span>
              <span className="text-[11px] font-mono text-primary font-bold px-1.5 py-0.2 rounded bg-primary/10 border border-primary/30">
                {selectedChapters.length} / {availableChapters.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectAllChapters}
                className="text-[10px] font-mono uppercase text-primary hover:underline px-1.5 py-0.5"
              >
                All
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={handleClearChapters}
                className="text-[10px] font-mono uppercase text-white/40 hover:text-white px-1.5 py-0.5"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Chapter search */}
          <div className="relative">
            <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={chapterSearch}
              onChange={e => setChapterSearch(e.target.value)}
              placeholder="Filter chapters..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-black/60 border border-outline-variant text-[11px] font-mono text-white placeholder:text-white/30 outline-none focus:border-primary"
            />
          </div>

          {/* Chapter list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredChapters.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-white/40">No chapters found</div>
            ) : (
              filteredChapters.map(c => {
                const chapterId = c.id || c.name;
                const isSelected = selectedChapters.includes(chapterId);
                const topicCount = (c.topics || []).length;
                return (
                  <label
                    key={chapterId}
                    className={`flex items-center justify-between p-2 text-xs font-mono border transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10 text-white font-medium'
                        : 'border-white/5 bg-surface-dim/40 text-white/70 hover:bg-surface-bright/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleChapter(c)}
                        className="rounded-none accent-primary shrink-0"
                      />
                      <span className="truncate text-[11px]">{c.name}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono shrink-0">
                      {topicCount} topics
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ── Topics Multi-Select Column ── */}
        <div className="border border-outline-variant bg-surface-container/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Topics
              </span>
              <span className="text-[11px] font-mono text-primary font-bold px-1.5 py-0.2 rounded bg-primary/10 border border-primary/30">
                {selectedTopics.length} / {availableTopics.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectAllTopics}
                className="text-[10px] font-mono uppercase text-primary hover:underline px-1.5 py-0.5"
              >
                All
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={handleClearTopics}
                className="text-[10px] font-mono uppercase text-white/40 hover:text-white px-1.5 py-0.5"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Topic search */}
          <div className="relative">
            <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={topicSearch}
              onChange={e => setTopicSearch(e.target.value)}
              placeholder="Filter topics by name..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-black/60 border border-outline-variant text-[11px] font-mono text-white placeholder:text-white/30 outline-none focus:border-primary"
            />
          </div>

          {/* Topic list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredTopics.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-white/40">
                {availableTopics.length === 0 ? 'Select a chapter to show topics' : 'No topics found'}
              </div>
            ) : (
              filteredTopics.map(t => {
                const isSelected = selectedTopics.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between p-2 text-xs font-mono border transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10 text-white font-medium'
                        : 'border-white/5 bg-surface-dim/40 text-white/70 hover:bg-surface-bright/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTopic(t.id)}
                        className="rounded-none accent-primary shrink-0"
                      />
                      <div className="min-w-0 truncate">
                        <div className="truncate text-[11px]">{t.name}</div>
                        <div className="text-[9px] text-white/40 truncate">{t.chapterName}</div>
                      </div>
                    </div>
                    {t.confidence !== undefined && t.confidence !== null && (
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-surface-container text-primary shrink-0 border border-primary/20">
                        {t.confidence}/10
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Scope Summary Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-black/50 border border-outline-variant text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap text-white/70">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Active Scope:</span>
          <span className="text-primary font-bold">
            {selectedChapters.length > 0 ? `${selectedChapters.length} Chapter${selectedChapters.length === 1 ? '' : 's'}` : 'All Chapters'}
          </span>
          <span className="text-white/30">&bull;</span>
          <span className="text-primary font-bold">
            {selectedTopics.length > 0 ? `${selectedTopics.length} Topic${selectedTopics.length === 1 ? '' : 's'}` : 'All Topics'}
          </span>
        </div>

        {(selectedChapters.length > 0 || selectedTopics.length > 0) && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSelectedChips(v => !v)}
              className="text-[10px] font-mono uppercase text-white/60 hover:text-primary flex items-center gap-1"
            >
              <span>{showSelectedChips ? 'Hide Tags' : 'Show Tags'}</span>
              {showSelectedChips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[10px] font-mono uppercase text-error hover:underline flex items-center gap-0.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Selected Chips Dropdown */}
      {showSelectedChips && selectedTopics.length > 0 && (
        <div className="p-3 bg-surface-container border border-outline-variant rounded-none space-y-2 animate-fade-in">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
            Selected Topics ({selectedTopics.length}):
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {selectedTopics.map(id => {
              const topic = availableTopics.find(t => t.id === id);
              if (!topic) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/40 text-primary text-[10px] font-mono"
                >
                  <span className="truncate max-w-[160px]">{topic.name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleTopic(id)}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
