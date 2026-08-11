import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.updateProfile({
        display_name: displayName,
        target_exam_year: targetYear
      });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center px-4 max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-display text-primary tracking-tight mb-2">Welcome!</h1>
        <p className="text-body-lg text-on-surface-variant">Let's set up your profile</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-body-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-1" htmlFor="display-name">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              className="block w-full px-3 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md bg-surface-bright outline-none"
            />
          </div>

          <div>
            <label className="block text-label-sm-mono text-on-surface-variant mb-1" htmlFor="target-year">
              Target Exam Year
            </label>
            <select
              id="target-year"
              value={targetYear}
              onChange={e => setTargetYear(parseInt(e.target.value))}
              className="block w-full px-3 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md bg-surface-bright outline-none"
            >
              {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                <option key={y} value={y}>JEE {y}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !displayName}
            className="w-full py-2.5 px-4 rounded-lg bg-primary-container text-on-primary text-headline-md font-semibold hover:bg-primary transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Start Tracking'}
          </button>
        </form>
      </div>
    </div>
  );
}
