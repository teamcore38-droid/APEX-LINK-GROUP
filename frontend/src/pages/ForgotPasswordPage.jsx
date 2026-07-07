import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Sparkles } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const submitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setResetUrl('');

    try {
      const { data } = await axios.post('/api/users/forgot-password', { email });
      setSuccess(data.message || 'Password reset instructions are ready.');
      setResetUrl(data.resetUrl || '');
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.response?.data?.message || 'Unable to start password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f9fc] py-20">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(11,31,58,0.08)] border border-gray-100">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Password Recovery</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark">Forgot your password?</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Enter your account email and we’ll prepare a reset flow for you.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={submitHandler} className="mt-8 space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Preparing Reset...' : 'Send Reset Instructions'}
            </button>
          </form>

          {resetUrl && (
            <div className="mt-8 rounded-[24px] border border-brand-accent/30 bg-brand-light p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Developer Reset Link</p>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    Email delivery is not configured yet, so the development reset URL is exposed below for local testing only.
                  </p>
                  <a
                    href={resetUrl}
                    className="mt-3 block break-all text-sm font-semibold text-brand-primary underline"
                  >
                    {resetUrl}
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-gray-600">
            Remembered it?{' '}
            <Link to="/login" className="font-bold text-brand-primary transition-colors duration-200 hover:text-brand-dark">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
