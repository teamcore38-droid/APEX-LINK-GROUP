import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, PackagePlus, Send, Store, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';

const INITIAL_PRODUCT = {
  name: '',
  slug: '',
  category: '',
  price: '0',
  compareAtPrice: '',
  weight: '',
  countInStock: '0',
  lowStockThreshold: '10',
  image: '',
  images: '',
  shortDescription: '',
  description: '',
  origin: '',
  ingredients: '',
  brand: '',
  sku: '',
};

const PRODUCT_FIELDS = [
  ['name', 'Name'],
  ['slug', 'Slug'],
  ['category', 'Category'],
  ['price', 'Price'],
  ['compareAtPrice', 'Compare Price'],
  ['countInStock', 'Stock'],
  ['lowStockThreshold', 'Low Stock Alert'],
  ['sku', 'SKU'],
  ['brand', 'Brand'],
  ['weight', 'Weight'],
  ['origin', 'Origin'],
  ['ingredients', 'Ingredients'],
  ['image', 'Primary Image'],
  ['images', 'Gallery Images'],
];

const buildProductPayload = (form) => ({
  ...form,
  price: Number(form.price || 0),
  compareAtPrice: Number(form.compareAtPrice || 0),
  countInStock: Number(form.countInStock || 0),
  lowStockThreshold: Number(form.lowStockThreshold || 10),
  images: String(form.images || '')
    .split('\n')
    .map((image) => image.trim())
    .filter(Boolean),
  variants: [],
  brand: form.brand || 'Vendor Supplier',
  isActive: true,
});

const VendorDashboardPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT);
  const [productSaving, setProductSaving] = useState(false);
  const [quoteDrafts, setQuoteDrafts] = useState({});

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${userInfo?.token}`,
        'Content-Type': 'application/json',
      },
    }),
    [userInfo?.token]
  );

  const loadDashboard = useCallback(async () => {
    if (!userInfo?.token) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/vendors/dashboard', config);
      setDashboard(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load vendor dashboard.');
    } finally {
      setLoading(false);
    }
  }, [config, userInfo?.token]);

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDashboard, navigate, userInfo?.token]);

  const updateProductForm = (key, value) => {
    setMessage('');
    setError('');
    setProductForm((current) => ({ ...current, [key]: value }));
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setProductSaving(true);
    setMessage('');
    setError('');

    try {
      await axios.post('/api/vendors/product-submissions', buildProductPayload(productForm), config);
      setProductForm(INITIAL_PRODUCT);
      setMessage('Product submitted for admin approval.');
      await loadDashboard();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.response?.data?.message || 'Unable to submit product.');
    } finally {
      setProductSaving(false);
    }
  };

  const updateQuoteDraft = (rfqId, key, value) => {
    setQuoteDrafts((current) => ({
      ...current,
      [rfqId]: {
        amount: '',
        currency: 'LKR',
        leadTimeDays: '',
        message: '',
        ...(current[rfqId] || {}),
        [key]: value,
      },
    }));
  };

  const submitQuote = async (rfqId) => {
    setMessage('');
    setError('');
    try {
      await axios.post(`/api/vendors/rfqs/${rfqId}/quotes`, quoteDrafts[rfqId] || {}, config);
      setMessage('Quote submitted.');
      await loadDashboard();
    } catch (quoteError) {
      console.error(quoteError);
      setError(quoteError.response?.data?.message || 'Unable to submit quote.');
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-brand-primary">
        <Loader2 className="mx-auto mb-3 animate-spin" /> Loading vendor dashboard
      </div>
    );
  }

  const metrics = dashboard?.metrics || dashboard?.vendor?.metrics || {};
  const vendor = dashboard?.vendor;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Marketplace</p>
          <h1 className="mt-2 flex items-center text-3xl font-serif font-bold text-brand-dark">
            <Store className="mr-3 text-brand-accent" /> Vendor Dashboard
          </h1>
          {vendor && <p className="mt-2 text-sm text-gray-500">{vendor.businessName} - {vendor.status}</p>}
        </div>
        <Link to="/vendor/onboarding" className="rounded-md border border-brand-primary/20 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary">
          Vendor Profile
        </Link>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
      {message && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">{message}</div>}

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          ['Orders', metrics.totalOrders || 0],
          ['Revenue', formatCurrency(metrics.totalRevenue || 0)],
          ['Commission', formatCurrency(metrics.totalCommission || 0)],
          ['Payouts', formatCurrency(metrics.totalPayouts || 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-serif font-bold text-brand-dark">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_1.1fr]">
        <form onSubmit={submitProduct} className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center text-xl font-serif font-bold text-brand-dark">
            <PackagePlus className="mr-2 text-brand-accent" /> Product Submission
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {PRODUCT_FIELDS.map(([key, label]) => (
              <label key={key} className={key === 'images' ? 'md:col-span-2' : ''}>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
                {key === 'images' ? (
                  <textarea
                    rows={3}
                    value={productForm[key]}
                    onChange={(event) => updateProductForm(key, event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
                  />
                ) : (
                  <input
                    value={productForm[key]}
                    onChange={(event) => updateProductForm(key, event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
                  />
                )}
              </label>
            ))}
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Short Description</span>
              <input
                value={productForm.shortDescription}
                onChange={(event) => updateProductForm('shortDescription', event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Description</span>
              <textarea
                rows={5}
                value={productForm.description}
                onChange={(event) => updateProductForm('description', event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
              />
            </label>
          </div>
          <button type="submit" disabled={productSaving} className="mt-5 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60">
            {productSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
            Submit Product
          </button>
        </form>

        <div className="space-y-8">
          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-xl font-serif font-bold text-brand-dark">
              <WalletCards className="mr-2 text-brand-accent" /> Recent Vendor Orders
            </h2>
            <div className="space-y-3">
              {(dashboard?.recentOrders || []).map((order) => (
                <div key={order._id} className="rounded-xl border border-gray-100 bg-brand-light p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-brand-primary">{order.order?._id || order.order}</span>
                    <span className="font-serif font-bold text-brand-dark">{formatCurrency(order.netTotal, order.currency)}</span>
                  </div>
                  <p className="mt-2 text-gray-600">{order.payoutStatus} - {order.orderStatus}</p>
                </div>
              ))}
              {(dashboard?.recentOrders || []).length === 0 && <p className="text-sm text-gray-500">No vendor orders yet.</p>}
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-serif font-bold text-brand-dark">Product Submissions</h2>
            <div className="space-y-3">
              {(dashboard?.submissions || []).map((submission) => (
                <div key={submission._id} className="rounded-xl border border-gray-100 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-brand-dark">{submission.payload?.name || 'Product draft'}</span>
                    <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-primary">{submission.status}</span>
                  </div>
                  {submission.reviewNote && <p className="mt-2 text-gray-500">{submission.reviewNote}</p>}
                </div>
              ))}
              {(dashboard?.submissions || []).length === 0 && <p className="text-sm text-gray-500">No submissions yet.</p>}
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-serif font-bold text-brand-dark">RFQ Queue</h2>
            <div className="space-y-4">
              {(dashboard?.rfqs || []).map((rfq) => {
                const draft = quoteDrafts[rfq._id] || { amount: '', currency: rfq.targetCurrency || 'LKR', leadTimeDays: '', message: '' };
                return (
                  <div key={rfq._id} className="rounded-xl border border-gray-100 p-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-dark">{rfq.productInterest}</p>
                        <p className="text-gray-500">{rfq.quantity} units - {rfq.deliveryCity || rfq.deliveryCountry || 'Delivery TBD'}</p>
                      </div>
                      <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-primary">{rfq.status}</span>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      <input value={draft.amount} onChange={(event) => updateQuoteDraft(rfq._id, 'amount', event.target.value)} placeholder="Amount" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                      <input value={draft.currency} onChange={(event) => updateQuoteDraft(rfq._id, 'currency', event.target.value)} placeholder="Currency" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                      <input value={draft.leadTimeDays} onChange={(event) => updateQuoteDraft(rfq._id, 'leadTimeDays', event.target.value)} placeholder="Lead days" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                      <button type="button" onClick={() => submitQuote(rfq._id)} className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white">Quote</button>
                      <textarea value={draft.message} onChange={(event) => updateQuoteDraft(rfq._id, 'message', event.target.value)} placeholder="Message" rows={2} className="md:col-span-4 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                  </div>
                );
              })}
              {(dashboard?.rfqs || []).length === 0 && <p className="text-sm text-gray-500">No assigned RFQs.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
