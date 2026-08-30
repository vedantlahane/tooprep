import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_MODE = String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(DEMO_MODE ? 'demo@tooprep.dev' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'demo1234' : '');
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
      // Clean up the URL
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
        msg = 'An account with this email already exists. Click "Sign In Instead" below.';
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
      <div className="min-h-screen px-6 py-12 md:p-12 animate-fade-in max-w-lg mx-auto">
        <h1 className="text-display text-primary mb-12 font-light">tooprep</h1>
        <div className="bg-primary text-on-primary p-8">
          <span className="material-symbols-outlined text-white text-5xl mb-4 block">check_circle</span>
          <h2 className="text-headline-lg font-light mb-2">account created</h2>
          <p className="text-body-md text-white/80 mb-8">
            check your email to confirm your account, then sign in.
          </p>
          <button
            onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }}
            className="w-full py-3 bg-white text-primary text-body-md font-semibold uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-12 md:pt-24 px-6 md:px-12 animate-fade-in max-w-md mx-auto">
      <h1 className="text-display text-on-surface mb-8 font-light">tooprep</h1>

      <div className="w-full">
        <h2 className="text-headline-lg mb-8 font-light lowercase">
          {isSignUp ? 'create account' : 'sign in'}
        </h2>

        {DEMO_MODE && (
          <div className="mb-6 p-4 bg-primary/20 border-l-4 border-primary text-body-md text-on-surface">
            demo auth is active.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error text-on-error text-body-md">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          <button
            type="button"
            onClick={async () => {
              try {
                setLoading(true);
                await signInWithGoogle();
              } catch (err) {
                setError(err.message || 'Google sign-in failed');
                setLoading(false);
              }
            }}
            disabled={loading || DEMO_MODE}
            className="w-full flex items-center justify-center gap-3 py-4 border-2 border-outline-variant text-on-surface text-body-md font-semibold uppercase tracking-widest hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            continue with google
          </button>

          <div className="flex items-center text-on-surface-variant">
            <div className="flex-1 h-px bg-outline-variant"></div>
            <span className="px-4 text-label-sm-mono uppercase tracking-widest">or email</span>
            <div className="flex-1 h-px bg-outline-variant"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email address"
              required
              className="block w-full px-4 py-3 border-2 border-outline-variant bg-surface-container-low focus:ring-0 focus:border-primary focus:bg-surface-bright text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant lowercase"
            />
          </div>

          <div>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
              required
              minLength={6}
              className="block w-full px-4 py-3 border-2 border-outline-variant bg-surface-container-low focus:ring-0 focus:border-primary focus:bg-surface-bright text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant lowercase"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
            >
              {loading ? 'please wait...' : isSignUp ? 'create account' : 'sign in'}
            </button>
          </div>

          {DEMO_MODE && (
            <button
              type="button"
              onClick={handleDemoFill}
              className="w-full py-3 border-2 border-primary text-primary text-body-md font-semibold uppercase tracking-widest hover:bg-primary/10 transition-colors"
            >
              use demo account
            </button>
          )}

          <div className="pt-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="w-full py-4 border-2 border-outline-variant text-on-surface text-body-md font-semibold uppercase tracking-widest hover:border-on-surface transition-colors"
            >
              {isSignUp ? 'sign in instead' : 'create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

