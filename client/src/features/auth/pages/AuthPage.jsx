import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_MODE = String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(DEMO_MODE ? 'demo@tooprep.dev' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'demo1234' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Catch OAuth callback errors (e.g., from Supabase redirect mismatch)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error_description') || hashParams.get('error');
    if (hashError) {
      setError(decodeURIComponent(hashError).replace(/\+/g, ' '));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        if (DEMO_MODE) {
          navigate('/');
          return;
        }
        setSignUpSuccess(true);
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      let msg = err.message || 'Authentication failed';
      if (msg.includes('User already registered')) {
        msg = 'An account with this email already exists. Click "Sign In" above.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid email or password. Please check your credentials or create an account.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'Password must be at least 6 characters long.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('demo@tooprep.dev');
    setPassword('demo1234');
    setError('');
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 animate-fade-in text-left">
        <div className="max-w-md w-full border border-primary/40 bg-primary/[0.04] p-8 space-y-6 relative">
          <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary" />
          <div className="flex items-center gap-3 text-primary">
            <CheckCircle2 className="w-8 h-8 text-primary shrink-0" />
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold">REGISTRATION COMPLETE</div>
              <h2 className="text-2xl font-light text-white">Account Created</h2>
            </div>
          </div>
          <p className="text-sm text-white/80 font-light leading-relaxed">
            We sent a verification link to <strong className="text-white font-mono">{email}</strong>. Please check your inbox to confirm your account, then sign in below.
          </p>
          <div className="pt-2">
            <button
              onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }}
              className="w-full py-3.5 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all cursor-pointer"
            >
              Proceed to Sign In &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black flex flex-col justify-between p-4 sm:p-8 animate-fade-in w-full max-w-[100vw] overflow-x-hidden">
      {/* Top Minimal Ambient Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6 select-none">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-xl sm:text-2xl font-light tracking-tight text-white group-hover:text-primary transition-colors">
            tooprep
          </span>
          <span className="text-white/30 text-xs">&middot;</span>
          <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
            JEE PREP
          </span>
        </Link>

        <Link
          to="/"
          className="text-xs font-mono text-white/50 hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </header>

      {/* Focused Authentication Card */}
      <main className="max-w-md mx-auto w-full flex-1 flex items-center justify-center py-6 sm:py-10">
        <div className="w-full border border-white/15 bg-white/[0.02] p-6 sm:p-8 space-y-6 text-left relative">
          <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary" />

          {/* Pivot Tabs: Sign In / Create Account */}
          <div className="flex items-baseline gap-6 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`text-2xl sm:text-3xl font-light tracking-tight lowercase transition-colors cursor-pointer ${
                !isSignUp ? 'text-white border-b-2 border-primary pb-1 font-normal' : 'text-white/40 hover:text-white'
              }`}
            >
              sign in
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`text-2xl sm:text-3xl font-light tracking-tight lowercase transition-colors cursor-pointer ${
                isSignUp ? 'text-white border-b-2 border-primary pb-1 font-normal' : 'text-white/40 hover:text-white'
              }`}
            >
              create account
            </button>
          </div>

          {/* Demo Mode Notice */}
          {DEMO_MODE && (
            <div className="p-3 border border-primary/30 bg-primary/10 flex items-center justify-between text-xs font-mono">
              <span className="text-primary font-semibold">Demo credentials available</span>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-white hover:underline uppercase text-[11px]"
              >
                Autofill &rarr;
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 border border-error/40 bg-error/10 text-error text-xs font-mono leading-relaxed">
              {error}
            </div>
          )}

          {/* Google One-Click OAuth */}
          <button
            type="button"
            onClick={async () => {
              try {
                setLoading(true);
                await signInWithGoogle();
              } catch (err) {
                setError(err.message || 'Google authentication failed');
                setLoading(false);
              }
            }}
            disabled={loading || DEMO_MODE}
            className="w-full flex items-center justify-center gap-3 py-3 border border-white/15 bg-white/[0.02] text-white hover:border-primary hover:text-primary transition-all text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center text-white/30 text-[10px] font-mono uppercase tracking-widest">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-3">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="auth-email" className="block text-[10px] font-mono uppercase tracking-wider text-white/60 font-semibold">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@student.com"
                  required
                  className="w-full px-3.5 py-2.5 border border-white/15 bg-white/[0.02] focus:border-primary focus:bg-white/[0.04] text-sm text-white font-mono outline-none transition-all placeholder:text-white/30"
                />
                <Mail className="w-4 h-4 text-white/30 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="auth-password" className="block text-[10px] font-mono uppercase tracking-wider text-white/60 font-semibold">
                Password {isSignUp && <span className="text-white/40 font-normal">(min 6 characters)</span>}
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 border border-white/15 bg-white/[0.02] focus:border-primary focus:bg-white/[0.04] text-sm text-white font-mono outline-none transition-all placeholder:text-white/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Please wait...' : isSignUp ? 'Create Free Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {DEMO_MODE && (
              <button
                type="button"
                onClick={handleDemoFill}
                className="w-full py-2 border border-primary/40 text-primary text-xs font-mono font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors cursor-pointer"
              >
                Autofill Demo Credentials
              </button>
            )}
          </form>

          {/* Bottom Switcher */}
          <div className="pt-2 border-t border-white/10 text-center text-xs font-mono text-white/50">
            {isSignUp ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(''); }}
                  className="text-primary hover:underline font-bold uppercase cursor-pointer"
                >
                  Sign In &rarr;
                </button>
              </span>
            ) : (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(''); }}
                  className="text-primary hover:underline font-bold uppercase cursor-pointer"
                >
                  Register Free &rarr;
                </button>
              </span>
            )}
          </div>
        </div>
      </main>

      {/* Ambient Footer */}
      <footer className="max-w-md mx-auto w-full pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/40 select-none">
        <div>&copy; 2026 TooPrep</div>
        <Link to="/" className="hover:text-white transition-colors">
          Knowledge Map
        </Link>
      </footer>
    </div>
  );
}
