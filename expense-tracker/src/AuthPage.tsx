import { useState, type FormEvent } from 'react';
import { login, signup, type StoredUser } from './authService';

/* =========================================
   AUTH PAGE — Tailwind CSS v4
   Shared Login / Sign-up template with glassmorphic styling
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
    setConfirm('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

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
      onAuthenticated({ email: res.email, fullName: res.fullName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_minmax(390px,460px)] items-center justify-center p-6 md:p-12 lg:p-20 overflow-hidden bg-gradient-to-br from-[#211d52] via-[#403592] to-[#7458b9]">
      {/* Background ambient lighting */}
      <div className="absolute top-[-240px] right-[20%] w-[500px] h-[500px] rounded-full bg-cyan-400/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[20%] w-[450px] h-[450px] rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />

      {/* Left visual column */}
      <div className="hidden lg:flex flex-col justify-center relative max-w-xl text-white pr-8 select-none">
        {/* Floating background decorative orbs */}
        <div className="absolute top-4 right-12 w-48 h-48 rounded-full bg-gradient-to-br from-[#6cf5ff] via-[#8862ff] to-[#f767c3] shadow-[inset_12px_12px_24px_rgba(255,255,255,0.4),0_20px_40px_rgba(20,4,80,0.3)] animate-auth-float opacity-90 pointer-events-none" />
        <div className="absolute bottom-6 right-36 w-24 h-24 rounded-full bg-gradient-to-br from-[#faacdd] via-[#f958ae] to-[#7c4eff] shadow-[inset_8px_8px_16px_rgba(255,255,255,0.4),0_15px_30px_rgba(20,4,80,0.3)] animate-auth-float [animation-delay:-2.4s] opacity-85 pointer-events-none" />
        <div className="absolute bottom-28 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-[#e7fbff] via-[#76d9ff] to-[#8b61ff] shadow-[inset_6px_6px_12px_rgba(255,255,255,0.4),0_10px_20px_rgba(20,4,80,0.25)] animate-auth-float [animation-delay:-4.2s] opacity-90 pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-flex items-center mb-6 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 text-xs font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
            ExpenseTracker
          </span>
          <h2 className="text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] drop-shadow-md">
            Make every rupee<br />feel accounted for.
          </h2>
          <p className="mt-5 text-white/80 text-base max-w-sm leading-relaxed">
            A focused, unified workspace for the projects, purchases, and financial decisions that matter.
          </p>

          {/* Mini preview card */}
          <div className="mt-10 w-56 p-4 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-2xl -rotate-3 transition-transform hover:rotate-0 duration-300">
            <span className="block text-[10px] font-bold tracking-wider uppercase text-white/70">
              Monthly overview
            </span>
            <strong className="block mt-1 text-2xl font-black text-white tracking-tight">
              ₹24,800
            </strong>
            <div className="h-7 flex items-end gap-1 mt-3">
              <span className="w-2.5 h-[35%] rounded-sm bg-white/75" />
              <span className="w-2.5 h-[60%] rounded-sm bg-white/75" />
              <span className="w-2.5 h-[45%] rounded-sm bg-white/75" />
              <span className="w-2.5 h-[80%] rounded-sm bg-white/75" />
              <span className="w-2.5 h-[65%] rounded-sm bg-white/75" />
              <span className="w-2.5 h-[90%] rounded-sm bg-white/75" />
              <span className="w-2.5 h-full rounded-sm bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Right form card */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto rounded-3xl p-7 sm:p-9 border border-white/35 bg-white/15 backdrop-blur-2xl shadow-[0_24px_70px_rgba(20,5,70,0.3)] animate-scale-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-xl shadow-inner">
            💸
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            ExpenseTracker
          </span>
        </div>

        <div className="mb-6 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-white/75 mt-1.5 leading-relaxed">
            {isLogin
              ? 'Log in to pick up where you left off with your works.'
              : 'Sign up and start tracking your works and expenses.'}
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="relative grid grid-cols-2 p-1 rounded-xl bg-[#1e125b]/25 border border-white/20 mb-6">
          <button
            type="button"
            className={`relative z-10 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              isLogin ? 'text-white' : 'text-white/60 hover:text-white'
            }`}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            className={`relative z-10 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              !isLogin ? 'text-white' : 'text-white/60 hover:text-white'
            }`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/20 border border-white/30 rounded-lg shadow-sm transition-transform duration-200 ${
              isLogin ? 'left-1 translate-x-0' : 'left-1 translate-x-full'
            }`}
          />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="space-y-1.5 text-left animate-fade-in">
              <label className="block text-xs font-semibold text-white/90 tracking-wide" htmlFor="auth-fullname">
                Full name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-white/60 pointer-events-none">
                  {icons.user}
                </span>
                <input
                  id="auth-fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoFocus={!isLogin}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/25 bg-white/10 text-white placeholder-white/40 text-sm outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-white/90 tracking-wide" htmlFor="auth-email">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-white/60 pointer-events-none">
                {icons.mail}
              </span>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus={isLogin}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/25 bg-white/10 text-white placeholder-white/40 text-sm outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-white/90 tracking-wide" htmlFor="auth-password">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-white/60 pointer-events-none">
                {icons.lock}
              </span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-11 rounded-xl border border-white/25 bg-white/10 text-white placeholder-white/40 text-sm outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
              />
              <button
                type="button"
                className="absolute right-2.5 p-1 text-white/60 hover:text-white rounded-lg transition-colors cursor-pointer"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? icons.eyeOff : icons.eye}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5 text-left animate-fade-in">
              <label className="block text-xs font-semibold text-white/90 tracking-wide" htmlFor="auth-confirm">
                Confirm password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-white/60 pointer-events-none">
                  {icons.lock}
                </span>
                <input
                  id="auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/25 bg-white/10 text-white placeholder-white/40 text-sm outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-900/40 border border-rose-300/30 text-rose-100 text-xs font-medium animate-fade-in" role="alert">
              <span className="shrink-0">{icons.alert}</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 rounded-xl font-bold text-sm bg-white text-[#493b9a] hover:bg-[#f5f3ff] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-black/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading && (
              <span className="w-4 h-4 rounded-full border-2 border-[#493b9a]/30 border-t-[#493b9a] animate-spin" />
            )}
            <span>
              {loading
                ? isLogin ? 'Logging in…' : 'Creating account…'
                : isLogin ? 'Log in' : 'Create account'}
            </span>
          </button>
        </form>

        <p className="mt-6 text-xs text-white/70 text-center">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="font-bold text-white hover:underline cursor-pointer"
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-bold text-white hover:underline cursor-pointer"
                onClick={() => switchMode('login')}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
