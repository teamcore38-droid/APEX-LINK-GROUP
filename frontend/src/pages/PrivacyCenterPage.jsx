import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PrivacyCenterPage = () => {
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [exportData, setExportData] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${userInfo?.token}`,
        'Content-Type': 'application/json',
      },
    }),
    [userInfo?.token]
  );

  const loadRequests = useCallback(async () => {
    if (!userInfo?.token) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.get('/api/privacy/requests', config);
      setRequests(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load privacy requests.');
    } finally {
      setLoading(false);
    }
  }, [config, userInfo?.token]);

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/privacy-center');
      return;
    }

    const timer = window.setTimeout(loadRequests, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests, navigate, userInfo?.token]);

  const runAction = async (key, action, successMessage) => {
    setSavingKey(key);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadRequests();
    } catch (actionError) {
      console.error(actionError);
      setError(actionError.response?.data?.message || actionError.message || 'Privacy action failed.');
    } finally {
      setSavingKey('');
    }
  };

  const requestExport = () =>
    runAction(
      'export-request',
      () => axios.post('/api/privacy/requests', { type: 'export' }, config),
      'Data export request created.'
    );

  const downloadExport = () =>
    runAction(
      'export-download',
      async () => {
        const { data } = await axios.get('/api/privacy/export', config);
        setExportData(JSON.stringify(data, null, 2));
      },
      'Data export generated.'
    );

  const requestDeletion = () =>
    runAction(
      'delete-request',
      () => axios.post('/api/privacy/requests', { type: 'delete' }, config),
      'Deletion request recorded.'
    );

  const confirmDeletion = () =>
    runAction(
      'delete-confirm',
      async () => {
        await axios.post('/api/privacy/delete-account', { confirmation: deleteConfirmation }, config);
        await logout();
        navigate('/');
      },
      'Account data deleted.'
    );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="container mx-auto max-w-5xl px-4">
        <Link to="/privacy" className="text-sm font-semibold text-brand-primary">Privacy Policy</Link>
        <section className="mt-5 rounded-lg bg-brand-dark p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-accent">Privacy Center</p>
          <h1 className="mt-3 font-serif text-4xl font-bold">Data Access & Deletion</h1>
          <p className="mt-3 text-sm leading-7 text-white/70">Request a data export, review privacy history, or start account deletion.</p>
        </section>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="flex items-center font-serif text-2xl font-bold text-brand-dark">
              <Download className="mr-2 text-brand-accent" /> Data Export
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">Create an export request, then generate a JSON copy of account, order, wishlist, review, return, support, and consent data.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={requestExport} className="rounded-md border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                Request Export
              </button>
              <button type="button" onClick={downloadExport} className="rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white">
                {savingKey === 'export-download' ? 'Generating...' : 'Generate JSON'}
              </button>
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="flex items-center font-serif text-2xl font-bold text-brand-dark">
              <Trash2 className="mr-2 text-brand-accent" /> Delete Request
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">Deletion anonymizes account details and revokes active sessions while preserving operational order records.</p>
            <button type="button" onClick={requestDeletion} className="mt-5 rounded-md border border-red-200 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-700">
              Record Deletion Request
            </button>
            <div className="mt-4 grid gap-3">
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="Type DELETE MY DATA"
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
              <button type="button" onClick={confirmDeletion} className="rounded-md bg-red-700 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white">
                Confirm Delete
              </button>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="flex items-center font-serif text-2xl font-bold text-brand-dark">
            <ShieldCheck className="mr-2 text-brand-accent" /> Request History
          </h2>
          <div className="mt-5 space-y-3">
            {requests.map((request) => (
              <div key={request._id} className="rounded-lg border border-gray-100 p-4 text-sm">
                <p className="font-semibold text-brand-dark">{request.type.toUpperCase()} - {request.status}</p>
                <p className="mt-1 text-gray-500">{new Date(request.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {requests.length === 0 && <p className="text-sm text-gray-500">No privacy requests yet.</p>}
          </div>
        </section>

        {exportData && (
          <textarea
            readOnly
            value={exportData}
            rows={14}
            className="mt-8 w-full rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs"
          />
        )}
      </div>
    </div>
  );
};

export default PrivacyCenterPage;
