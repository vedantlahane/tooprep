import { useState, useMemo, useRef, useEffect } from 'react';
import Icon, { Search, Check, ChevronDown, BookOpen, Layers, X } from './Icon';

export default function TopicPicker({
  topics = [],
  selectedTopicId = '',
  onSelect,
  placeholder = 'Select curriculum topic...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedTopic = useMemo(() => {
    return topics.find(t => t.id === selectedTopicId || t.topic_id === selectedTopicId) || null;
  }, [topics, selectedTopicId]);

  const subjects = useMemo(() => {
    const set = new Set(topics.map(t => t.subject || t.subject_name).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [topics]);

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      const subject = t.subject || t.subject_name || '';
      const chapter = t.chapter || t.chapter_name || '';
      const name = t.name || t.topic_name || '';

      if (subjectFilter !== 'ALL' && subject !== subjectFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return name.toLowerCase().includes(q) || chapter.toLowerCase().includes(q) || subject.toLowerCase().includes(q);
      }

      return true;
    });
  }, [topics, subjectFilter, searchQuery]);

  // Group filtered topics by Chapter
  const groupedByChapter = useMemo(() => {
    const groups = {};
    filteredTopics.forEach(t => {
      const key = `${t.subject || t.subject_name || 'General'} \u203A ${t.chapter || t.chapter_name || 'Other'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTopics]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 bg-surface-dim border-2 border-outline-variant hover:border-primary/60 focus:border-primary text-left transition-colors flex items-center justify-between rounded-sm group"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          {selectedTopic ? (
            <div className="min-w-0 truncate">
              <div className="text-[11px] font-mono uppercase tracking-widest text-primary truncate">
                {(selectedTopic.subject || selectedTopic.subject_name)} &rsaquo; {(selectedTopic.chapter || selectedTopic.chapter_name)}
              </div>
              <div className="text-sm font-medium text-white truncate">
                {selectedTopic.name || selectedTopic.topic_name}
              </div>
            </div>
          ) : (
            <span className="text-white/40 text-sm font-light uppercase tracking-wider">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedTopic && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-surface-container text-white/70 border border-white/10">
              {selectedTopic.confidence !== undefined && selectedTopic.confidence !== null ? `Conf: ${selectedTopic.confidence}/10` : 'Unrated'}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-white/60 group-hover:text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Flyout Searchable Topic Matrix Picker */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-dim border border-outline-variant shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[460px] animate-fade-in">
          {/* Header & Search Bar */}
          <div className="p-3 bg-surface-container border-b border-outline-variant space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topic or chapter by keyword..."
                className="w-full bg-black/60 border border-outline-variant rounded-sm pl-9 pr-8 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:border-primary outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subject Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {subjects.map(s => {
                const count = s === 'ALL'
                  ? topics.length
                  : topics.filter(t => (t.subject || t.subject_name) === s).length;
                const isSelected = subjectFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubjectFilter(s)}
                    className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-black font-bold'
                        : 'bg-surface text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{s}</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouped Topics List */}
          <div className="p-2 overflow-y-auto flex-1 divide-y divide-white/5 space-y-3">
            {Object.keys(groupedByChapter).length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs font-mono space-y-2">
                <Search className="w-6 h-6 mx-auto opacity-30" />
                <div>No topics matching "{searchQuery}"</div>
              </div>
            ) : (
              Object.entries(groupedByChapter).map(([chapterGroup, chapterTopics]) => (
                <div key={chapterGroup} className="pt-2 first:pt-0">
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-primary/80 font-bold flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary"></span>
                    <span>{chapterGroup}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {chapterTopics.map(t => {
                      const topicId = t.id || t.topic_id;
                      const isSelected = selectedTopicId === topicId;
                      const conf = t.confidence;

                      return (
                        <button
                          key={topicId}
                          type="button"
                          onClick={() => {
                            onSelect(topicId);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors flex items-center justify-between group ${
                            isSelected
                              ? 'bg-primary/20 border border-primary text-white font-medium'
                              : 'hover:bg-surface-container text-white/80 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-sans">{t.name || t.topic_name}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                            {conf !== undefined && conf !== null && (
                              <span className="text-white/40 group-hover:text-white/70">
                                {conf}/10
                              </span>
                            )}
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 px-3 bg-surface-container/60 border-t border-outline-variant flex items-center justify-between text-[11px] font-mono text-white/40">
            <span>Showing {filteredTopics.length} of {topics.length} topics</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-primary hover:underline font-bold uppercase tracking-wider text-[10px]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
