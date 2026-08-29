import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center px-4 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-display text-primary tracking-tight mb-2">TooPrep</h1>
          <p className="text-body-lg text-on-surface-variant">Systematic Preparation & Analysis</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6">
          <div className="text-center">
            <span className="material-symbols-outlined text-tertiary-container text-5xl mb-3 block">check_circle</span>
            <h2 className="text-headline-md mb-2">Account Created!</h2>
            <p className="text-body-md text-on-surface-variant mb-4">
              Check your email to confirm your account, then sign in.
            </p>
            <button
              onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }}
              className="w-full py-2.5 px-4 rounded-lg bg-primary-container text-on-primary text-headline-md font-semibold hover:bg-primary transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center px-4 max-w-md mx-auto relative">
      {/* Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-display text-primary tracking-tight mb-2">TooPrep</h1>
        <p className="text-body-lg text-on-surface-variant">Systematic Preparation & Analysis</p>
      </div>

      {/* Auth Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6 relative z-10 hover:shadow-md transition-shadow duration-300">
        <h2 className="text-headline-md mb-4 pb-2 border-b border-surface-variant">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-1" htmlFor="auth-email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline text-xl">mail</span>
              </div>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="aspirant@example.com"
                required
                className="block w-full pl-10 pr-3 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md bg-surface-bright outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-1" htmlFor="auth-password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline text-xl">lock</span>
              </div>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="block w-full pl-10 pr-3 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md bg-surface-bright outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary-container text-on-primary text-headline-md font-semibold hover:bg-primary active:shadow-inner transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface-container-lowest text-on-surface-variant text-label-sm-mono">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="w-full py-2.5 px-4 border border-outline-variant rounded-lg bg-surface-container-lowest text-headline-md text-primary hover:bg-surface-container-low transition-colors"
          >
            {isSignUp ? 'Sign In Instead' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden opacity-10 pointer-events-none -z-10 h-64">
        <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-primary-container rounded-full blur-3xl mix-blend-multiply"></div>
        <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-secondary-container rounded-full blur-3xl mix-blend-multiply"></div>
      </div>
    </div>
  );
}
