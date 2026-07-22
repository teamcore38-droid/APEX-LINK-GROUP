import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import GoogleLoginButton from '../components/GoogleLoginButton';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);
    if (value.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (event) => {
    const value = event.target.value;
    setPassword(value);
    if (value) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleTwoFactorCodeChange = (event) => {
    const value = event.target.value;
    setTwoFactorCode(value);
    if (value.trim()) {
      setFieldErrors((prev) => ({ ...prev, twoFactorCode: '' }));
    }
  };

  const submitHandler = async (event) => {
    event.preventDefault();
    setError('');

    const nextFieldErrors = {};
    if (!twoFactorChallenge) {
      if (!email.trim()) {
        nextFieldErrors.email = 'This field is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        nextFieldErrors.email = 'Please enter a valid email address';
      }

      if (!password) {
        nextFieldErrors.password = 'This field is required';
      }
    } else {
      if (!twoFactorCode.trim()) {
        nextFieldErrors.twoFactorCode = 'This field is required';
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

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
    <div className="bg-[#fff7ee] py-6 md:py-8 pb-16">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)] border border-gray-100">
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

          <form noValidate onSubmit={submitHandler} className="mt-8 space-y-5">
            {!twoFactorChallenge ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      className={`w-full rounded-xl border bg-[#fff7ee] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition ${
                        fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                      }`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.email}</p>
                  )}
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
                      value={password}
                      onChange={handlePasswordChange}
                      className={`w-full rounded-xl border bg-[#fff7ee] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition ${
                        fieldErrors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                      }`}
                      placeholder="Enter your password"
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.password}</p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Admin Verification Code</label>
                <div className="relative">
                  <ShieldCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={twoFactorCode}
                    onChange={handleTwoFactorCodeChange}
                    className={`w-full rounded-xl border bg-[#fff7ee] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition ${
                      fieldErrors.twoFactorCode ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                    }`}
                    placeholder="6-digit code"
                  />
                </div>
                {fieldErrors.twoFactorCode && (
                  <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.twoFactorCode}</p>
                )}
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

          {!twoFactorChallenge && (
            <div className="mt-6">
              <div className="relative mb-6 flex items-center justify-center">
                <div className="w-full border-t border-gray-200" />
                <span className="absolute bg-white px-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                  Or
                </span>
              </div>
              <GoogleLoginButton onSuccess={() => navigate(redirect)} />
            </div>
          )}

          <div className="mt-8 rounded-2xl bg-brand-light px-4 py-3 text-center text-sm text-gray-600">
            New to Apex Fashion?{' '}
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
