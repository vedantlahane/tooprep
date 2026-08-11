import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StatusDot from '../components/StatusDot';

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'status', direction: 'asc' });
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique subjects
  const subjects = useMemo(() => {
    const set = new Set(data.map(r => r.subject_name).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [data]);

  // Filter by subject
  const filtered = useMemo(() => {
    if (subjectFilter === 'ALL') return data;
    return data.filter(r => r.subject_name === subjectFilter);
  }, [data, subjectFilter]);

  // Sort
  const sorted = useMemo(() => {
    const statusOrder = {
      OVERCONFIDENT: 0, WEAK_ALIGNED: 1, PRELIMINARY: 2,
      INSUFFICIENT_DATA: 3, UNDERCONFIDENT: 4, ALIGNED: 5
    };

    return [...filtered].sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'status':
          aVal = statusOrder[a.status] ?? 99;
          bVal = statusOrder[b.status] ?? 99;
          break;
        case 'confidence':
          aVal = a.confidence ?? -1;
          bVal = b.confidence ?? -1;
          break;
        case 'evaluation_accuracy':
          aVal = a.evaluation_accuracy ?? -1;
          bVal = b.evaluation_accuracy ?? -1;
          break;
        case 'questions_attempted':
          aVal = a.questions_attempted ?? 0;
          bVal = b.questions_attempted ?? 0;
          break;
        case 'avg_time_seconds':
          aVal = a.avg_time_seconds ?? 9999;
          bVal = b.avg_time_seconds ?? 9999;
          break;
        case 'pyq_accuracy':
          aVal = a.pyq_accuracy ?? -1;
          bVal = b.pyq_accuracy ?? -1;
          break;
        case 'last_practiced_at':
          aVal = a.last_practiced_at || '';
          bVal = b.last_practiced_at || '';
          break;
        default:
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatTime = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const SortHeader = ({ label, sortKey, className = '' }) => (
    <th
      className={`py-2.5 px-3 lg:px-4 text-label-sm-mono text-on-surface-variant font-medium cursor-pointer hover:text-primary transition-colors select-none ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span className="material-symbols-outlined text-xs text-primary">
            {sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        )}
      </div>
    </th>
  );

  const getConfidenceStyle = (confidence) => {
    if (!confidence) return 'bg-surface-container text-on-surface-variant';
    if (confidence >= 8) return 'bg-tertiary-container/10 text-tertiary border-l-2 border-tertiary';
    if (confidence >= 5) return 'bg-primary-fixed/30 text-primary border-l-2 border-primary';
    return 'bg-error-container/20 text-error border-l-2 border-error';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse-soft text-primary text-headline-md">Loading Knowledge Map...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-display text-on-surface">Knowledge Map</h2>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Track your confidence vs. performance across all topics.
          </p>
        </div>

        {/* Subject Tabs */}
        <div className="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-x-auto no-scrollbar">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`flex-shrink-0 px-4 lg:px-6 py-2 text-body-md font-semibold rounded-lg whitespace-nowrap transition-all duration-150 ${
                subjectFilter === s
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {s === 'ALL' ? 'All Subjects' : s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-container-high bg-surface-bright">
                <SortHeader label="Subject" sortKey="subject_name" />
                <SortHeader label="Chapter" sortKey="chapter_name" />
                <SortHeader label="Topic" sortKey="topic_name" />
                <SortHeader label="Confidence" sortKey="confidence" className="text-center" />
                <SortHeader label="Qs Attempted" sortKey="questions_attempted" className="text-center" />
                <SortHeader label="Eval Accuracy" sortKey="evaluation_accuracy" className="text-center" />
                <SortHeader label="Avg Time/Q" sortKey="avg_time_seconds" className="text-center" />
                <SortHeader label="PYQ %" sortKey="pyq_accuracy" className="text-center" />
                <SortHeader label="Last Practiced" sortKey="last_practiced_at" className="text-right" />
                <SortHeader label="Status" sortKey="status" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {sorted.map(row => (
                <tr
                  key={row.topic_id}
                  onClick={() => navigate(`/topics/${row.topic_id}`)}
                  className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                >
                  <td className="py-3 px-3 lg:px-4">
                    <span className="text-label-sm-mono text-on-surface-variant">{row.subject_name}</span>
                  </td>
                  <td className="py-3 px-3 lg:px-4">
                    <span className="text-body-md text-on-surface-variant">{row.chapter_name}</span>
                  </td>
                  <td className="py-3 px-3 lg:px-4">
                    <span className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {row.topic_name}
                    </span>
                  </td>
                  <td className="py-3 px-3 lg:px-4 text-center">
                    {row.confidence ? (
                      <span className={`text-label-mono px-2 py-0.5 rounded ${getConfidenceStyle(row.confidence)}`}>
                        {row.confidence}/10
                      </span>
                    ) : (
                      <span className="text-label-mono text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 lg:px-4 text-center">
                    <span className="text-label-mono text-on-surface">{row.questions_attempted || 0}</span>
                  </td>
                  <td className="py-3 px-3 lg:px-4 text-center">
                    <span className="text-label-mono text-on-surface">
                      {row.evaluation_accuracy !== null ? `${row.evaluation_accuracy}%` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 lg:px-4 text-center">
                    <span className="text-label-mono text-on-surface">{formatTime(row.avg_time_seconds)}</span>
                  </td>
                  <td className="py-3 px-3 lg:px-4 text-center">
                    <span className="text-label-mono text-on-surface">
                      {row.pyq_accuracy !== null ? `${row.pyq_accuracy}%` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 lg:px-4 text-right">
                    <span className="text-label-mono text-on-surface-variant">{formatDate(row.last_practiced_at)}</span>
                  </td>
                  <td className="py-3 px-3 lg:px-4">
                    <StatusDot status={row.status} />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-body-lg text-on-surface-variant">
                    No topics found. Check your database seed data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-label-sm-mono text-on-surface-variant text-center">
        {sorted.length} topics · Click any row for details · Click column headers to sort
      </p>
    </div>
  );
}
