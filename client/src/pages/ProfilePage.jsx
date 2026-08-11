import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [biggestGap, setBiggestGap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [targetYear, setTargetYear] = useState(2027);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, gapData] = await Promise.all([
        api.getProfile(),
        api.getBiggestGap().catch(() => null)
      ]);
      setProfile(profileData);
      setBiggestGap(gapData);
      setDisplayName(profileData.display_name || '');
      setTargetYear(profileData.target_exam_year || 2027);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.updateProfile({ display_name: displayName, target_exam_year: targetYear });
      setEditing(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getGapColor = (status) => {
    switch (status) {
      case 'ALIGNED': return 'text-status-aligned';
      case 'OVERCONFIDENT': return 'text-status-overconfident';
      case 'UNDERCONFIDENT': return 'text-status-underconfident';
      case 'WEAK_ALIGNED': return 'text-status-weak';
      default: return 'text-on-surface-variant';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse-soft text-primary text-headline-md">Loading...</div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-display text-on-surface mb-6">Profile</h2>

      {/* Profile Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">person</span>
          </div>
          <div>
            <h3 className="text-headline-md text-on-surface">{profile?.display_name || 'Student'}</h3>
            <p className="text-body-md text-on-surface-variant">{user?.email}</p>
            {profile?.target_exam_year && (
              <span className="inline-block mt-1 text-label-sm-mono px-2 py-0.5 rounded bg-primary-fixed text-primary border-l-2 border-primary">
                JEE {profile.target_exam_year}
              </span>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4 pt-4 border-t border-surface-variant">
            <div>
              <label className="block text-label-sm-mono text-on-surface-variant mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-bright outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-label-sm-mono text-on-surface-variant mb-1">Target Exam Year</label>
              <select
                value={targetYear}
                onChange={e => setTargetYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-bright outline-none focus:ring-2 focus:ring-primary"
              >
                {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                  <option key={y} value={y}>JEE {y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-body-md text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Edit Profile
          </button>
        )}
      </div>

      {/* Biggest Gap Insight */}
      {biggestGap && biggestGap.name && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-label-sm-mono text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-base align-middle mr-1">insights</span>
            BIGGEST CONFIDENCE GAP
          </h3>
          <div
            className="cursor-pointer hover:bg-surface-container-low rounded-lg p-4 -m-1 transition-colors"
            onClick={() => navigate(`/topics/${biggestGap.id}`)}
          >
            <p className="text-body-md text-on-surface-variant mb-1">
              {biggestGap.chapters?.subjects?.name} › {biggestGap.chapters?.name}
            </p>
            <h4 className="text-headline-md text-on-surface mb-3">{biggestGap.name}</h4>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-label-sm-mono text-on-surface-variant">Confidence</span>
                <div className="text-headline-md text-primary font-bold">{biggestGap.confidence}/10</div>
              </div>
              <div>
                <span className="text-label-sm-mono text-on-surface-variant">Eval Accuracy</span>
                <div className="text-headline-md text-on-surface font-bold">{biggestGap.evaluation_accuracy}%</div>
              </div>
              <div>
                <span className="text-label-sm-mono text-on-surface-variant">Gap</span>
                <div className={`text-headline-md font-bold ${getGapColor(biggestGap.status)}`}>
                  {biggestGap.gap >= 0 ? `+${biggestGap.gap}` : biggestGap.gap}
                </div>
              </div>
              <div>
                <span className="text-label-sm-mono text-on-surface-variant">Status</span>
                <div className={`text-headline-md font-bold capitalize ${getGapColor(biggestGap.status)}`}>
                  {biggestGap.status?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-label-sm-mono text-on-surface-variant mb-4">QUICK ACTIONS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/practice')}
            className="p-4 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors text-left flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-primary text-2xl">school</span>
            <div>
              <div className="text-body-md font-semibold text-on-surface">Practice Mode</div>
              <div className="text-label-sm-mono text-on-surface-variant">Untimed, with solutions</div>
            </div>
          </button>
          <button
            onClick={() => navigate('/evaluate')}
            className="p-4 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors text-left flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-error text-2xl">quiz</span>
            <div>
              <div className="text-body-md font-semibold text-on-surface">Timed Evaluation</div>
              <div className="text-label-sm-mono text-on-surface-variant">Exam conditions</div>
            </div>
          </button>
        </div>
      </div>

      {/* Admin link */}
      {profile?.is_admin && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-label-sm-mono text-on-surface-variant mb-3">ADMIN</h3>
          <button
            onClick={() => navigate('/admin/questions')}
            className="p-4 rounded-lg border border-primary/30 hover:bg-primary-fixed/20 transition-colors text-left flex items-center gap-3 w-full"
          >
            <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
            <div>
              <div className="text-body-md font-semibold text-primary">Manage Questions</div>
              <div className="text-label-sm-mono text-on-surface-variant">Add questions to the bank</div>
            </div>
          </button>
        </div>
      )}

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="w-full py-3 rounded-lg border border-error/30 text-error text-body-md font-semibold hover:bg-error-container/20 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
