import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { useAuth } from '@/features/auth/context/AuthContext';
import Icon, {
  User,
  GraduationCap,
  History,
  Play,
  Timer,
  Shield,
  UploadCloud,
  RefreshCw,
  LogOut,
  BookOpen,
  Sparkles,
  ArrowRight,
  Activity,
  LayoutGrid
} from '@/shared/components/Icon';

export default function ProfilePage() {
  const { user, signOut, refreshProfile } = useAuth();
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
      if (refreshProfile) await refreshProfile();
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-mono">Loading Student Telemetry...</div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full max-w-5xl min-w-0 mr-auto animate-fade-in space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Student Profile
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight lowercase">
            student profile
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Exam target trajectory, personal credentials, and system administration.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-white/10 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
        >
          open knowledge map
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="acrylic-glass border border-white/10 rounded-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent border-b border-white/5"></div>
        <div className="p-6 md:p-8 relative">
          <div className="absolute -top-10 left-6 md:left-8 w-20 h-20 bg-black border-2 border-primary rounded-sm flex items-center justify-center shadow-xl">
            <User className="w-10 h-10 text-primary" />
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-light text-white lowercase">{profile?.display_name || 'Student'}</h3>
              <p className="text-xs font-mono text-white/50 mt-1">{user?.email}</p>
              {profile?.target_exam_year && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-xs text-xs font-mono uppercase tracking-wider">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Target: JEE Main {profile.target_exam_year}
                </div>
              )}
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2 border border-primary text-primary text-xs font-mono uppercase tracking-widest hover:bg-primary hover:text-white transition-colors rounded-sm font-semibold"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {editing && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4 max-w-md animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-white/60 uppercase tracking-widest block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-white/15 bg-surface-container focus:border-primary text-white outline-none rounded-sm transition-colors text-sm font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-white/60 uppercase tracking-widest block">Target Exam Year</label>
                <select
                  value={targetYear}
                  onChange={e => setTargetYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-white/15 bg-surface-container focus:border-primary text-white outline-none rounded-sm transition-colors text-sm font-mono"
                >
                  {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                    <option key={y} value={y} className="bg-black text-white">JEE {y}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-primary text-white text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-sm"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 border border-white/10 text-white/60 text-xs font-mono uppercase tracking-widest hover:bg-white/5 transition-colors rounded-sm"
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
          className="cursor-pointer bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm flex flex-col justify-between transition-all group"
        >
          <History className="w-8 h-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Activity Log</div>
            <h3 className="text-xl font-light text-white lowercase">Session History</h3>
            <p className="text-xs text-white/50 font-mono mt-1">Review past evaluations, practice drills, and longitudinal trends.</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/practice')}
          className="cursor-pointer bg-surface-container/60 border border-white/10 hover:border-primary p-6 rounded-sm flex flex-col justify-between transition-all group"
        >
          <Play className="w-8 h-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Foundation</div>
            <h3 className="text-xl font-light text-white lowercase">Practice Drill</h3>
            <p className="text-xs text-white/50 font-mono mt-1">Untimed question sets with instant step-by-step LaTeX solution reveal.</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/evaluate')}
          className="cursor-pointer bg-primary/20 border border-primary/40 hover:border-primary p-6 rounded-sm flex flex-col justify-between transition-all group"
        >
          <Timer className="w-8 h-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Diagnostic</div>
            <h3 className="text-xl font-light text-white lowercase">Timed Evaluation</h3>
            <p className="text-xs text-white/60 font-mono mt-1">Simulated test conditions to scientifically calibrate your confidence gap.</p>
          </div>
        </div>
      </div>

      {/* Admin Section */}
      {profile?.is_admin && (
        <div className="acrylic-glass border border-primary/30 p-6 md:p-8 rounded-sm space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
              <Shield className="w-4 h-4" />
              Administrative Operations
            </h3>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-1.5 bg-primary text-white text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 flex items-center gap-1.5 transition-all"
            >
              <span>Open Mission Control</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-4 border border-white/10 bg-surface-container/60 hover:border-primary transition-colors text-left rounded-sm group flex items-start gap-3"
            >
              <Activity className="w-5 h-5 text-status-weak mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-white">Observability</div>
                <div className="text-xs text-white/50 font-mono mt-0.5">Real-time telemetry and cohort metrics</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/questions')}
              className="p-4 border border-white/10 bg-surface-container/60 hover:border-primary transition-colors text-left rounded-sm group flex items-start gap-3"
            >
              <BookOpen className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-white">Question Bank</div>
                <div className="text-xs text-white/50 font-mono mt-0.5">Full CRUD editor, LaTeX previews, deletion</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/curriculum')}
              className="p-4 border border-white/10 bg-surface-container/60 hover:border-primary transition-colors text-left rounded-sm group flex items-start gap-3"
            >
              <LayoutGrid className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-white">Curriculum Matrix</div>
                <div className="text-xs text-white/50 font-mono mt-0.5">Syllabus coverage gap auditor</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/content')}
              className="p-4 border border-white/10 bg-surface-container/60 hover:border-primary transition-colors text-left rounded-sm group flex items-start gap-3"
            >
              <UploadCloud className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-white">Content Ops</div>
                <div className="text-xs text-white/50 font-mono mt-0.5">Upload exam PDFs and verify extracted candidates</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="pt-6 flex justify-center">
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-6 py-2.5 border border-white/10 text-white/60 text-xs font-mono uppercase tracking-widest hover:text-error hover:border-error transition-colors rounded-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Platform
        </button>
      </div>
    </div>
  );
}
