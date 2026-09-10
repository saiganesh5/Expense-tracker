import { useState, type FormEvent } from 'react';
import './AuthPage.css';
import { login, signup, type StoredUser } from './authService';

/* =========================================
   AUTH PAGE — shared Login / Sign-up template
   -----------------------------------------
   Login and Sign up render through ONE card and share their state:
   the email + password you type carry across when you toggle modes,
   and both flows funnel through the same submit / error / loading path.
   ========================================= */

type Mode = 'login' | 'signup';

const icons = {
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  mail: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
  ),
  lock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  eyeOff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  ),
};

export default function AuthPage({ onAuthenticated }: { onAuthenticated: (user: StoredUser) => void }) {
  const [mode, setMode] = useState<Mode>('login');

  // Shared info: these persist across the Login <-> Sign-up toggle.
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  function switchMode(next: Mode) {
    if (next === mode || loading) return;
    setMode(next);
    setError(null);
    // Email + password stay (shared info); confirm is signup-only, so reset it.
    setConfirm('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    // ---- Client-side validation (mirrors the backend's rules) ----
    if (!isLogin && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!isLogin) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = isLogin
        ? await login(email.trim(), password)
        : await signup(fullName.trim(), email.trim(), password);
      // authService has already stored the token + user; hand the user up to the app.
      onAuthenticated({ email: res.email, fullName: res.fullName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-orb auth-orb-three" />
        <div className="auth-visual-copy">
          <span className="auth-eyebrow">ExpenseTracker</span>
          <h2>Make every rupee<br />feel accounted for.</h2>
          <p>A focused workspace for the projects, purchases, and decisions that matter.</p>
          <div className="auth-mini-card">
            <span>Monthly overview</span>
            <strong>₹24,800</strong>
            <i><b /> <b /> <b /> <b /> <b /> <b /> <b /></i>
          </div>
        </div>
      </div>
      <div className="auth-card animate-scale-in">
        <div className="auth-brand">
          <div className="auth-logo">💸</div>
          <span className="auth-logo-text">ExpenseTracker</span>
        </div>

        <div className="auth-heading">
          <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p>
            {isLogin
              ? 'Log in to pick up where you left off with your works.'
              : 'Sign up and start tracking your works and expenses.'}
          </p>
        </div>

        {/* Segmented toggle — the single control that swaps between the two forms */}
        <div className="auth-tabs" role="tablist" aria-label="Choose login or sign up">
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
          <span className="auth-tab-indicator" data-mode={mode} aria-hidden="true" />
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="form-group auth-field">
              <label className="form-label" htmlFor="auth-fullname">Full name</label>
              <div className="auth-input-wrap">
                <span className="auth-ficon">{icons.user}</span>
                <input
                  className="form-input"
                  id="auth-fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoFocus={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="form-group auth-field">
            <label className="form-label" htmlFor="auth-email">Email</label>
            <div className="auth-input-wrap">
              <span className="auth-ficon">{icons.mail}</span>
              <input
                className="form-input"
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus={isLogin}
              />
            </div>
          </div>

          <div className="form-group auth-field">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap has-eye">
              <span className="auth-ficon">{icons.lock}</span>
              <input
                className="form-input"
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? icons.eyeOff : icons.eye}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group auth-field">
              <label className="form-label" htmlFor="auth-confirm">Confirm password</label>
              <div className="auth-input-wrap">
                <span className="auth-ficon">{icons.lock}</span>
                <input
                  className="form-input"
                  id="auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              <span className="auth-error-icon">{icons.alert}</span>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading && <span className="auth-spinner" aria-hidden="true" />}
            {loading
              ? isLogin ? 'Logging in…' : 'Creating account…'
              : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className="auth-switch-btn" onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-switch-btn" onClick={() => switchMode('login')}>
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
