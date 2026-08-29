import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_MODE = import.meta.env.DEV || String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(DEMO_MODE ? 'demo@tooprep.dev' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'demo1234' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

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
