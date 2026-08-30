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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-16">
      <h2 className="text-display text-on-surface font-light lowercase">profile</h2>

      {/* Profile Header Card */}
      <div className="acrylic border border-outline-variant rounded-md overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"></div>
        <div className="p-6 md:p-8 relative">
          <div className="absolute -top-12 left-6 md:left-8 w-20 h-20 bg-surface border-2 border-outline-variant rounded-md flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-primary text-[40px]">person</span>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-headline-lg font-light text-on-surface lowercase">{profile?.display_name || 'Student'}</h3>
              <p className="text-body-md text-on-surface-variant font-light mt-0.5">{user?.email}</p>
              {profile?.target_exam_year && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-sm text-label-sm-mono uppercase tracking-widest text-xs">
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  JEE {profile.target_exam_year}
                </div>
              )}
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2 border border-primary text-primary text-label-sm-mono uppercase tracking-widest hover:bg-primary hover:text-white transition-colors rounded-sm text-xs"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {editing && (
            <div className="mt-6 pt-6 border-t border-outline-variant space-y-5 max-w-md animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant bg-surface-container focus:border-primary text-on-surface outline-none rounded-sm transition-colors text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs block">Target Exam Year</label>
                <select
                  value={targetYear}
                  onChange={e => setTargetYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-outline-variant bg-surface-container focus:border-primary text-on-surface outline-none rounded-sm transition-colors text-sm"
                >
                  {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                    <option key={y} value={y}>JEE {y}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-primary text-white text-label-sm-mono uppercase tracking-widest hover:brightness-110 transition-all rounded-sm text-xs"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 border border-outline-variant text-on-surface text-label-sm-mono uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Live Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/history')}
          className="metro-tile cursor-pointer bg-surface-container border border-outline-variant hover:border-primary text-on-surface p-6 rounded-md flex flex-col justify-between aspect-auto sm:aspect-square transition-colors"
        >
          <span className="material-symbols-outlined text-[36px] text-primary mb-4">history</span>
          <div>
            <h3 className="text-headline-md font-light lowercase">Session History</h3>
            <p className="text-body-sm text-on-surface-variant font-light mt-1">Review past evaluations, practice attempts, and accuracy trends.</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/practice')}
          className="metro-tile cursor-pointer bg-surface-container border border-outline-variant hover:border-primary text-on-surface p-6 rounded-md flex flex-col justify-between aspect-auto sm:aspect-square transition-colors"
        >
          <span className="material-symbols-outlined text-[36px] text-primary mb-4">school</span>
          <div>
            <h3 className="text-headline-md font-light lowercase">Practice Mode</h3>
            <p className="text-body-sm text-on-surface-variant font-light mt-1">Untimed questions with instant solution explanations.</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/evaluate')}
          className="metro-tile cursor-pointer bg-primary text-white p-6 rounded-md flex flex-col justify-between aspect-auto sm:aspect-square"
        >
          <span className="material-symbols-outlined text-[36px] mb-4">quiz</span>
          <div>
            <h3 className="text-headline-md font-light lowercase text-white">Timed Evaluation</h3>
            <p className="text-body-sm text-white/80 font-light mt-1">Test yourself under real exam conditions to calibrate your gap score.</p>
          </div>
        </div>
      </div>

      {/* Admin Section */}
      {profile?.is_admin && (
        <div className="acrylic border border-primary/30 p-6 md:p-8 rounded-md">
          <h3 className="text-label-sm-mono text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            Administration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/admin/content')}
              className="p-5 border border-outline-variant bg-surface-container hover:border-primary transition-colors text-left rounded-sm group flex items-start gap-4"
            >
              <span className="material-symbols-outlined text-primary text-[28px] mt-0.5 group-hover:scale-110 transition-transform">upload_file</span>
              <div>
                <div className="text-body-md font-semibold text-on-surface">Content Ops</div>
                <div className="text-body-sm text-on-surface-variant mt-0.5">Upload exam PDFs and verify extracted questions</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/admin/syncs')}
              className="p-5 border border-outline-variant bg-surface-container hover:border-primary transition-colors text-left rounded-sm group flex items-start gap-4"
            >
              <span className="material-symbols-outlined text-primary text-[28px] mt-0.5 group-hover:scale-110 transition-transform">sync</span>
              <div>
                <div className="text-body-md font-semibold text-on-surface">Sync Status</div>
                <div className="text-body-sm text-on-surface-variant mt-0.5">Monitor vector search and publication syncs</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="pt-8 flex justify-center">
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-6 py-2.5 border border-outline-variant text-on-surface-variant text-label-sm-mono uppercase tracking-widest hover:text-error hover:border-error transition-colors rounded-sm text-xs"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}
