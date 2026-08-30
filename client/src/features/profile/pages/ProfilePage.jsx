import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
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
        profileService.getProfile(),
        dashboardService.getBiggestGap().catch(() => null)
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
      await profileService.updateProfile({ display_name: displayName, target_exam_year: targetYear });
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
      case 'UNDERCONFIDENT': return 'text-primary';
      case 'WEAK_ALIGNED': return 'text-status-weak';
      default: return 'text-on-surface-variant';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-12">
      <h2 className="text-display text-on-surface font-light lowercase">profile</h2>

      {/* Profile Header Card */}
      <div className="acrylic border border-outline-variant rounded-md overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-tertiary/20"></div>
        <div className="p-6 md:p-10 relative">
          <div className="absolute -top-12 left-6 md:left-10 w-24 h-24 bg-surface border-4 border-surface-dim rounded-md flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-primary text-[48px]">person</span>
          </div>
          
          <div className="mt-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-headline-lg font-light text-on-surface lowercase">{profile?.display_name || 'Student'}</h3>
              <p className="text-body-lg text-on-surface-variant font-light mt-1">{user?.email}</p>
              {profile?.target_exam_year && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-sm text-label-sm-mono uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  JEE {profile.target_exam_year}
                </div>
              )}
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-2 border border-primary text-primary text-label-sm-mono uppercase tracking-widest hover:bg-primary hover:text-white transition-colors rounded-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {editing && (
            <div className="mt-8 pt-8 border-t border-outline-variant space-y-6 max-w-md animate-fade-in">
              <div className="space-y-2">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant bg-surface-container focus:border-primary text-on-surface outline-none rounded-sm transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest block">Target Exam Year</label>
                <select
                  value={targetYear}
                  onChange={e => setTargetYear(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-outline-variant bg-surface-container focus:border-primary text-on-surface outline-none rounded-sm transition-colors"
                >
                  {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                    <option key={y} value={y}>JEE {y}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-primary text-white text-label-sm-mono uppercase tracking-widest hover:brightness-110 transition-all rounded-sm"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3 border border-outline-variant text-on-surface text-label-sm-mono uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biggest Gap Live Tile */}
        {biggestGap && biggestGap.name && (
          <div 
            onClick={() => navigate(`/topics/${biggestGap.id}`)}
            className="metro-tile cursor-pointer col-span-1 md:col-span-2 bg-error text-white p-6 md:p-8 rounded-md relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <span className="material-symbols-outlined text-[120px]">warning</span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-label-sm-mono text-white/80 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">insights</span>
                Priority Focus Required
              </h3>
              
              <div className="text-body-md text-white/80 lowercase mb-1 mt-6">
                {biggestGap.chapters?.subjects?.name} &rsaquo; {biggestGap.chapters?.name}
              </div>
              <h4 className="text-headline-lg font-light lowercase mb-8">{biggestGap.name}</h4>
              
              <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                <div>
                  <span className="text-label-sm-mono text-white/60 uppercase tracking-widest">Confidence</span>
                  <div className="text-headline-md font-light mt-1">{biggestGap.confidence}/10</div>
                </div>
                <div>
                  <span className="text-label-sm-mono text-white/60 uppercase tracking-widest">Accuracy</span>
                  <div className="text-headline-md font-light mt-1">{biggestGap.evaluation_accuracy}%</div>
                </div>
                <div>
                  <span className="text-label-sm-mono text-white/60 uppercase tracking-widest">Gap</span>
                  <div className="text-headline-md font-bold mt-1">
                    {biggestGap.gap >= 0 ? `+${biggestGap.gap}` : biggestGap.gap}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Tiles */}
        <div 
          onClick={() => navigate('/history')}
          className="metro-tile cursor-pointer bg-tertiary/80 text-white p-8 rounded-md flex flex-col justify-between aspect-square"
        >
          <span className="material-symbols-outlined text-[48px] mb-6">history</span>
          <div>
            <h3 className="text-headline-md font-light lowercase">Session History</h3>
            <p className="text-body-md text-white/80 font-light mt-2">Track all your practice & evaluation sessions.</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/practice')}
          className="metro-tile cursor-pointer bg-tertiary text-white p-8 rounded-md flex flex-col justify-between aspect-square"
        >
          <span className="material-symbols-outlined text-[48px] mb-6">school</span>
          <div>
            <h3 className="text-headline-md font-light lowercase">Practice Mode</h3>
            <p className="text-body-md text-white/80 font-light mt-2">Untimed sessions with immediate solutions to build foundation.</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/evaluate')}
          className="metro-tile cursor-pointer bg-primary text-white p-8 rounded-md flex flex-col justify-between aspect-square"
        >
          <span className="material-symbols-outlined text-[48px] mb-6">quiz</span>
          <div>
            <h3 className="text-headline-md font-light lowercase">Evaluation</h3>
            <p className="text-body-md text-white/80 font-light mt-2">Timed, exam-like conditions to measure your true accuracy.</p>
          </div>
        </div>

        {/* Admin Section */}
        {profile?.is_admin && (
          <div className="col-span-1 md:col-span-2 acrylic border border-primary/30 p-8 rounded-md mt-4">
            <h3 className="text-label-sm-mono text-primary uppercase tracking-widest mb-6">Administration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/admin/questions')}
                className="p-6 border border-outline-variant bg-surface-container hover:border-primary transition-colors text-left rounded-sm group flex gap-4"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">quiz</span>
                <div>
                  <div className="text-body-lg font-semibold text-on-surface">Question Bank</div>
                  <div className="text-body-sm text-on-surface-variant mt-1">Manage & verify questions with solutions</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/content')}
                className="p-6 border border-outline-variant bg-surface-container hover:border-primary transition-colors text-left rounded-sm group flex gap-4"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">upload_file</span>
                <div>
                  <div className="text-body-lg font-semibold text-on-surface">Content Ops</div>
                  <div className="text-body-sm text-on-surface-variant mt-1">Upload PDFs and verify extracted candidates</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/syncs')}
                className="p-6 border border-outline-variant bg-surface-container hover:border-primary transition-colors text-left rounded-sm group flex gap-4"
              >
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">sync_problem</span>
                <div>
                  <div className="text-body-lg font-semibold text-on-surface">Sync Status</div>
                  <div className="text-body-sm text-on-surface-variant mt-1">Monitor Vector DB synchronization</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-12 pb-8 flex justify-center">
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-6 py-3 border border-outline-variant text-on-surface-variant text-label-sm-mono uppercase tracking-widest hover:text-error hover:border-error transition-colors rounded-sm"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}
