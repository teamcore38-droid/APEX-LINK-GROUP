import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { LockKeyhole } from 'lucide-react';

const ResetPasswordPage = () => {
  const { token } = useParams();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`/api/users/reset-password/${token}`, {
        newPassword,
        confirmPassword,
      });
      setSuccess(data.message || 'Password reset successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.response?.data?.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f9fc] py-20">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(11,31,58,0.08)] border border-gray-100">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Set a New Password</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark">Reset your account password</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Choose a strong new password to regain access to your Apex Link Group account.
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
              <label className="mb-2 block text-sm font-semibold text-brand-dark">New Password</label>
              <div className="relative">
                <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-dark">Confirm New Password</label>
              <div className="relative">
                <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                  placeholder="Repeat your new password"
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
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            Return to{' '}
            <Link to="/login" className="font-bold text-brand-primary transition-colors duration-200 hover:text-brand-dark">
              sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
