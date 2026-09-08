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
    <div className="w-full min-w-0 animate-fade-in space-y-8 pb-16 text-left">
      {/* ─── Header ─── */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-label-sm-mono text-primary uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Student Profile &middot; Metacognitive Account
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-white tracking-tight">
            Student Profile
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Exam target horizon, diagnostic credentials, and platform mission control.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          Open Knowledge Map
        </button>
      </div>

      {/* ─── Continuum Dual-Pane Widescreen Cockpit ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ─── Left Pane: Identity, Target Year, and Admin Controls (col-span-7) ─── */}
        <div className="lg:col-span-7 space-y-8">
          {/* Identity Block */}
          <div className="border border-white/10 p-6 bg-black space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary/10 border-2 border-primary flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-light text-white">{profile?.display_name || 'Student'}</h2>
                  <p className="text-xs font-mono text-white/50 mt-1">{user?.email}</p>
                  {profile?.target_exam_year && (
                    <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-0.5 bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Target: JEE Main {profile.target_exam_year}
                    </div>
                  )}
                </div>
              </div>

              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 border border-primary text-primary text-xs font-mono uppercase tracking-widest hover:bg-primary hover:text-black transition-colors font-bold cursor-pointer shrink-0"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Inline Edit Form */}
            {editing && (
              <div className="pt-6 border-t border-white/10 space-y-4 max-w-md animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-primary uppercase tracking-widest block">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent border-b border-white/20 focus:border-primary text-white outline-none transition-colors text-sm font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-primary uppercase tracking-widest block">Target Exam Year</label>
                  <select
                    value={targetYear}
                    onChange={e => setTargetYear(parseInt(e.target.value))}
                    className="w-full px-0 py-2 bg-transparent border-b border-white/20 focus:border-primary text-white outline-none transition-colors text-sm font-mono"
                  >
                    {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                      <option key={y} value={y} className="bg-black text-white">JEE {y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-3 border border-white/20 text-white/60 text-xs font-mono uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Administrative Mission Control */}
          {profile?.is_admin && (
            <div className="border border-primary/40 bg-black p-6 space-y-5">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-white/10 pb-3">
                <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Administrative Operations</span>
                </h3>
                <button
                  onClick={() => navigate('/admin')}
                  className="px-3.5 py-1.5 bg-primary text-black text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Mission Control</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/admin')}
                  className="p-4 border border-white/10 hover:border-primary/60 bg-black hover:bg-white/[0.02] transition-colors text-left group flex items-start gap-3 cursor-pointer"
                >
                  <Activity className="w-5 h-5 text-status-weak mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">Observability</div>
                    <div className="text-xs text-white/50 font-mono mt-0.5">Real-time system telemetry and student cohorts</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/questions')}
                  className="p-4 border border-white/10 hover:border-primary/60 bg-black hover:bg-white/[0.02] transition-colors text-left group flex items-start gap-3 cursor-pointer"
                >
                  <BookOpen className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">Question Bank</div>
                    <div className="text-xs text-white/50 font-mono mt-0.5">Full CRUD editor, LaTeX previews, deletions</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/curriculum')}
                  className="p-4 border border-white/10 hover:border-primary/60 bg-black hover:bg-white/[0.02] transition-colors text-left group flex items-start gap-3 cursor-pointer"
                >
                  <LayoutGrid className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">Curriculum Matrix</div>
                    <div className="text-xs text-white/50 font-mono mt-0.5">Subject coverage gap auditor & topics editor</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/content')}
                  className="p-4 border border-white/10 hover:border-primary/60 bg-black hover:bg-white/[0.02] transition-colors text-left group flex items-start gap-3 cursor-pointer"
                >
                  <UploadCloud className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">Content Ops</div>
                    <div className="text-xs text-white/50 font-mono mt-0.5">Upload exam PDFs and verify extracted candidates</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <div className="pt-2">
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-6 py-2.5 border border-white/15 text-white/60 text-xs font-mono uppercase tracking-widest hover:text-error hover:border-error transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Platform
            </button>
          </div>
        </div>

        {/* ─── Right Pane: Strategic Telemetry & Learning Hub (col-span-5) ─── */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          {/* Biggest Gap Metacognitive Alert Tile */}
          {biggestGap && biggestGap.gap !== undefined && (
            <div className={`p-5 border ${
              biggestGap.status === 'OVERCONFIDENT' ? 'border-status-overconfident/40 bg-status-overconfident/[0.03]' : 'border-status-weak/40 bg-status-weak/[0.03]'
            } bg-black space-y-2`}>
              <div className="text-[11px] font-mono text-status-overconfident uppercase tracking-widest font-bold">
                Metacognitive Gap Alert
              </div>
              <h4 className="text-lg font-light text-white tracking-tight">
                {biggestGap.topic_name}
              </h4>
              <div className="flex items-center gap-3 text-xs font-mono text-white/60 pt-1">
                <span>Self-rating: <strong className="text-white">{biggestGap.confidence}/10</strong></span>
                <span>&middot;</span>
                <span>Accuracy: <strong className="text-white">{biggestGap.evaluation_accuracy}%</strong></span>
              </div>
              <button
                onClick={() => navigate(`/topics/${biggestGap.topic_id}`)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-primary hover:underline cursor-pointer"
              >
                <span>Drill this topic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Diagnostic Action Live Tiles */}
          <div className="space-y-3">
            <div
              onClick={() => navigate('/history')}
              className="cursor-pointer bg-black border border-white/10 hover:border-primary p-5 flex items-start gap-4 transition-all group"
            >
              <History className="w-7 h-7 text-primary mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <div className="text-[11px] font-mono text-primary uppercase tracking-widest mb-0.5">Activity Log</div>
                <h4 className="text-lg font-light text-white">Session History</h4>
                <p className="text-xs text-white/50 font-mono mt-1">Review past evaluations, practice drills, and longitudinal progress.</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/practice')}
              className="cursor-pointer bg-black border border-white/10 hover:border-primary p-5 flex items-start gap-4 transition-all group"
            >
              <Play className="w-7 h-7 text-primary mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <div className="text-[11px] font-mono text-primary uppercase tracking-widest mb-0.5">Foundation</div>
                <h4 className="text-lg font-light text-white">Practice Drill</h4>
                <p className="text-xs text-white/50 font-mono mt-1">Untimed question sets with instant step-by-step LaTeX solution reveals.</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/evaluate')}
              className="cursor-pointer bg-black border border-white/10 hover:border-primary p-5 flex items-start gap-4 transition-all group"
            >
              <Timer className="w-7 h-7 text-primary mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <div className="text-[11px] font-mono text-primary uppercase tracking-widest mb-0.5">Diagnostic</div>
                <h4 className="text-lg font-light text-white">Timed Evaluation</h4>
                <p className="text-xs text-white/60 font-mono mt-1">Simulated test conditions to scientifically calibrate your confidence-accuracy gap.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
