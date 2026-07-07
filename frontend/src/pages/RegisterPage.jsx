import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, userInfo } = useAuth();
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({ name, email, phone, password, confirmPassword });
    } catch (registerError) {
      setError(registerError);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f9fc] py-20">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(11,31,58,0.08)] border border-gray-100">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Create Your Account</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark">Join the Apex Link Group marketplace</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Save delivery details, revisit orders, and enjoy a more refined shopping experience.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submitHandler} className="mt-8 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Full Name</label>
                <div className="relative">
                  <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Phone</label>
                <div className="relative">
                  <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

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

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Password</label>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Confirm Password</label>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="Repeat your password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl bg-brand-light px-4 py-3 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
              className="font-bold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
