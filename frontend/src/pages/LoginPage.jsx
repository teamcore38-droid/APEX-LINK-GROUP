import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const { login, verifyTwoFactorLogin, userInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  const submitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (twoFactorChallenge) {
        await verifyTwoFactorLogin({
          challengeId: twoFactorChallenge.challengeId,
          code: twoFactorCode,
        });
      } else {
        const result = await login(email, password);
        if (result?.requiresTwoFactor) {
          setTwoFactorChallenge(result);
          setLoading(false);
          return;
        }
      }
    } catch (loginError) {
      setError(loginError);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f9fc] py-20">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(11,31,58,0.08)] border border-gray-100">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Welcome Back</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark">Sign in to your account</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Review orders, manage addresses, and continue your premium shopping experience.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submitHandler} className="mt-8 space-y-5">
            {!twoFactorChallenge ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-brand-dark">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:text-brand-dark"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Admin Verification Code</label>
                <div className="relative">
                  <ShieldCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="6-digit code"
                  />
                </div>
                {twoFactorChallenge.developmentCode && (
                  <p className="mt-3 rounded-xl bg-brand-light px-4 py-3 text-xs font-semibold text-brand-dark">
                    Development code: {twoFactorChallenge.developmentCode}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Signing In...' : twoFactorChallenge ? 'Verify Admin Sign In' : 'Sign In'}
            </button>
            {twoFactorChallenge && (
              <button
                type="button"
                onClick={() => {
                  setTwoFactorChallenge(null);
                  setTwoFactorCode('');
                }}
                className="w-full text-xs font-bold uppercase tracking-[0.16em] text-brand-primary"
              >
                Use a different account
              </button>
            )}
          </form>

          <div className="mt-8 rounded-2xl bg-brand-light px-4 py-3 text-center text-sm text-gray-600">
            New to Apex Link Group?{' '}
            <Link
              to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
              className="font-bold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
            >
              Create your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
