import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, Send, SquarePen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';

const INITIAL_RFQ = {
  buyerName: '',
  buyerEmail: '',
  company: '',
  phone: '',
  category: '',
  productInterest: '',
  quantity: '1',
  targetCurrency: 'LKR',
  targetBudget: '',
  deliveryCountry: '',
  deliveryCity: '',
  message: '',
};

const RFQ_FIELDS = [
  ['buyerName', 'Buyer Name'],
  ['buyerEmail', 'Buyer Email'],
  ['company', 'Company'],
  ['phone', 'Phone'],
  ['category', 'Category'],
  ['productInterest', 'Product Requirement'],
  ['quantity', 'Quantity'],
  ['targetCurrency', 'Currency'],
  ['targetBudget', 'Target Budget'],
  ['deliveryCountry', 'Delivery Country'],
  ['deliveryCity', 'Delivery City'],
];

const RFQPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_RFQ);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${userInfo?.token}`,
        'Content-Type': 'application/json',
      },
    }),
    [userInfo?.token]
  );

  const loadRfqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/rfqs', config);
      setRfqs(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load RFQs.');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setForm((current) => ({
        ...current,
        buyerName: current.buyerName || userInfo.name || '',
        buyerEmail: current.buyerEmail || userInfo.email || '',
        phone: current.phone || userInfo.phone || '',
      }));
      loadRfqs();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadRfqs, navigate, userInfo]);

  const updateForm = (key, value) => {
    setMessage('');
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitRfq = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await axios.post(
        '/api/rfqs',
        {
          ...form,
          quantity: Number(form.quantity || 1),
          targetBudget: Number(form.targetBudget || 0),
        },
        config
      );
      setForm({
        ...INITIAL_RFQ,
        buyerName: userInfo.name || '',
        buyerEmail: userInfo.email || '',
        phone: userInfo.phone || '',
      });
      setMessage('RFQ submitted.');
      await loadRfqs();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.response?.data?.message || 'Unable to submit RFQ.');
    } finally {
      setSaving(false);
    }
  };

  const acceptQuote = async (rfqId, quoteId) => {
    setError('');
    setMessage('');
    try {
      await axios.put(`/api/rfqs/${rfqId}/quotes/${quoteId}/accept`, {}, config);
      setMessage('Quote accepted.');
      await loadRfqs();
    } catch (acceptError) {
      console.error(acceptError);
      setError(acceptError.response?.data?.message || 'Unable to accept quote.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">B2B Buying</p>
        <h1 className="mt-2 flex items-center text-3xl font-serif font-bold text-brand-dark">
          <SquarePen className="mr-3 text-brand-accent" /> Request a Quote
        </h1>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
      {message && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">{message}</div>}

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submitRfq} className="rounded-lg bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {RFQ_FIELDS.map(([key, label]) => (
              <label key={key} className={key === 'productInterest' ? 'md:col-span-2' : ''}>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => updateForm(key, event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
                />
              </label>
            ))}
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Message</span>
              <textarea
                rows={5}
                value={form.message}
                onChange={(event) => updateForm('message', event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
              />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60">
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
            Submit RFQ
          </button>
        </form>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-brand-dark">My RFQs</h2>
            {loading && <Loader2 size={18} className="animate-spin text-brand-primary" />}
          </div>
          <div className="space-y-4">
            {rfqs.map((rfq) => (
              <article key={rfq._id} className="rounded-xl border border-gray-100 bg-brand-light p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-serif text-lg font-bold text-brand-dark">{rfq.productInterest}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {rfq.quantity} units - {rfq.deliveryCity || rfq.deliveryCountry || 'Delivery TBD'}
                    </p>
                  </div>
                  <span className="self-start rounded-full border border-brand-accent/20 bg-white px-3 py-1 text-xs font-bold text-brand-primary">{rfq.status}</span>
                </div>

                {rfq.quotes?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {rfq.quotes.map((quote) => (
                      <div key={quote._id} className="rounded-xl bg-white p-3 text-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-brand-dark">{quote.vendorName || 'Vendor Quote'}</p>
                            <p className="text-gray-500">
                              {formatCurrency(quote.amount, quote.currency)} - {quote.leadTimeDays || 0} days - {quote.status}
                            </p>
                          </div>
                          {quote.status === 'Submitted' && rfq.status !== 'Accepted' && (
                            <button
                              type="button"
                              onClick={() => acceptQuote(rfq._id, quote._id)}
                              className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white"
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {rfqs.length === 0 && !loading && <p className="text-sm text-gray-500">No RFQs yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RFQPage;
