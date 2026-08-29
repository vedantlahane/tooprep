import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';

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
        <div className="text-display text-primary font-light animate-pulse-soft">loading...</div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-display text-on-surface mb-8 font-light lowercase">profile</h2>

      {/* Profile Card */}
      <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[40px]">person</span>
            </div>
            <div>
              <h3 className="text-headline-lg font-light text-on-surface lowercase">{profile?.display_name || 'student'}</h3>
              <p className="text-body-lg text-on-surface-variant font-light">{user?.email}</p>
              {profile?.target_exam_year && (
                <span className="inline-block mt-2 text-label-sm-mono px-3 py-1 bg-primary/20 text-primary uppercase tracking-widest font-bold">
                  jee {profile.target_exam_year}
                </span>
              )}
            </div>
          </div>
          
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="py-3 px-6 border-2 border-primary text-primary text-body-md font-semibold uppercase tracking-widest hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              edit profile
            </button>
          )}
        </div>

        {editing && (
          <div className="space-y-6 pt-6 border-t-2 border-surface-container">
            <div>
              <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full max-w-sm px-4 py-3 border-2 border-outline-variant bg-surface-container focus:ring-0 focus:border-primary focus:bg-surface-bright text-body-lg text-on-surface outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-2">target exam year</label>
              <select
                value={targetYear}
                onChange={e => setTargetYear(parseInt(e.target.value))}
                className="w-full max-w-sm px-4 py-3 border-2 border-outline-variant bg-surface-container focus:ring-0 focus:border-primary focus:bg-surface-bright text-body-lg text-on-surface outline-none transition-all"
              >
                {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                  <option key={y} value={y}>JEE {y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={handleSave}
                className="py-3 px-8 bg-primary text-white text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors"
              >
                save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="py-3 px-8 border-2 border-outline-variant text-body-md text-on-surface uppercase tracking-widest hover:border-on-surface transition-colors"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Biggest Gap Insight */}
      {biggestGap && biggestGap.name && (
        <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8 mb-8">
          <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">insights</span>
            biggest confidence gap
          </h3>
          <div
            className="cursor-pointer group transition-colors"
            onClick={() => navigate(`/topics/${biggestGap.id}`)}
          >
            <p className="text-body-lg text-on-surface-variant font-light mb-1 lowercase">
              {biggestGap.chapters?.subjects?.name} / {biggestGap.chapters?.name}
            </p>
            <h4 className="text-headline-lg font-light text-on-surface mb-6 group-hover:text-primary transition-colors lowercase">{biggestGap.name}</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-container p-4">
                <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">confidence</span>
                <div className="text-headline-lg text-primary font-light mt-1">{biggestGap.confidence}/10</div>
              </div>
              <div className="bg-surface-container p-4">
                <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">eval accuracy</span>
                <div className="text-headline-lg text-on-surface font-light mt-1">{biggestGap.evaluation_accuracy}%</div>
              </div>
              <div className="bg-surface-container p-4 border-l-4 border-status-overconfident">
                <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">gap</span>
                <div className={`text-headline-lg font-light mt-1 ${getGapColor(biggestGap.status)}`}>
                  {biggestGap.gap >= 0 ? `+${biggestGap.gap}` : biggestGap.gap}
                </div>
              </div>
              <div className="bg-surface-container p-4">
                <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">status</span>
                <div className={`text-headline-md font-semibold mt-2 uppercase tracking-widest ${getGapColor(biggestGap.status)}`}>
                  {biggestGap.status?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Quick Actions */}
        <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8">
          <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6">quick actions</h3>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/practice')}
              className="p-4 border-2 border-primary text-left flex items-start gap-4 hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[32px]">school</span>
              <div>
                <div className="text-body-lg font-semibold text-primary uppercase tracking-widest">practice</div>
                <div className="text-body-md text-on-surface-variant font-light lowercase mt-1">untimed, with solutions</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/evaluate')}
              className="p-4 border-2 border-error text-left flex items-start gap-4 hover:bg-error/10 transition-colors"
            >
              <span className="material-symbols-outlined text-error text-[32px]">quiz</span>
              <div>
                <div className="text-body-lg font-semibold text-error uppercase tracking-widest">evaluation</div>
                <div className="text-body-md text-on-surface-variant font-light lowercase mt-1">timed, exam conditions</div>
              </div>
            </button>
          </div>
        </div>

        {/* Admin link */}
        {profile?.is_admin && (
          <div className="bg-surface-dim border-2 border-outline-variant p-6 md:p-8">
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-6">admin</h3>
            <button
              onClick={() => navigate('/admin/questions')}
              className="w-full p-4 border-2 border-tertiary-container text-left flex items-start gap-4 hover:bg-tertiary-container/10 transition-colors"
            >
              <span className="material-symbols-outlined text-tertiary-container text-[32px]">add_circle</span>
              <div>
                <div className="text-body-lg font-semibold text-tertiary-container uppercase tracking-widest">manage questions</div>
                <div className="text-body-md text-on-surface-variant font-light lowercase mt-1">add questions to the bank</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="py-4 px-8 border-2 border-outline-variant text-on-surface text-body-md font-semibold uppercase tracking-widest hover:border-on-surface transition-colors"
      >
        sign out
      </button>
    </div>
  );
}
