import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Field = ({ label, value, onChange, type = 'text' }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-accent"
    />
  </label>
);

const AdminCommercePage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const canManageCommerce = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('commerce:manage') ||
      userInfo?.permissions?.includes('*')
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lowStock, setLowStock] = useState([]);
  const [inventoryEvents, setInventoryEvents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [returns, setReturns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [shippingRates, setShippingRates] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'percent', discountValue: 10, minSubtotal: 0, isActive: true });
  const [giftCardForm, setGiftCardForm] = useState({ code: '', balance: 100, currency: 'LKR', isActive: true });
  const [taxForm, setTaxForm] = useState({ country: 'LK', state: '', label: 'Sales Tax', rate: 0.15, isActive: true });
  const [shippingForm, setShippingForm] = useState({ carrier: 'Apex Logistics', service: 'Standard Delivery', country: '', state: '', basePrice: 10, freeShippingThreshold: 50, estimatedDaysMin: 3, estimatedDaysMax: 5, isActive: true });

  const config = userInfo?.token
    ? {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    : null;

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/admin/commerce');
      return;
    }

    if (!canManageCommerce) {
      navigate('/profile');
    }
  }, [canManageCommerce, navigate, userInfo]);

  const loadCommerce = async () => {
    if (!config) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [
        lowStockResponse,
        inventoryResponse,
        reviewResponse,
        returnResponse,
        couponResponse,
        giftCardResponse,
        taxResponse,
        shippingResponse,
      ] = await Promise.all([
        axios.get('/api/admin/commerce/inventory/low-stock', config),
        axios.get('/api/admin/commerce/inventory/events', config),
        axios.get('/api/reviews/admin/all', config),
        axios.get('/api/returns/admin/all', config),
        axios.get('/api/admin/commerce/coupons', config),
        axios.get('/api/admin/commerce/gift-cards', config),
        axios.get('/api/admin/commerce/tax-rules', config),
        axios.get('/api/admin/commerce/shipping-rates', config),
      ]);

      setLowStock(lowStockResponse.data);
      setInventoryEvents(inventoryResponse.data);
      setReviews(reviewResponse.data);
      setReturns(returnResponse.data);
      setCoupons(couponResponse.data);
      setGiftCards(giftCardResponse.data);
      setTaxRules(taxResponse.data);
      setShippingRates(shippingResponse.data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load commerce operations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo?.token && canManageCommerce) {
      const timer = window.setTimeout(() => {
        loadCommerce();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageCommerce, userInfo]);

  const submitForm = async (endpoint, payload, label) => {
    setError('');
    setSuccess('');

    try {
      await axios.post(endpoint, payload, config);
      setSuccess(`${label} saved.`);
      await loadCommerce();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || `Unable to save ${label.toLowerCase()}.`);
    }
  };

  const moderateReview = async (reviewId, status) => {
    await axios.put(`/api/reviews/admin/${reviewId}/status`, { status }, config);
    await loadCommerce();
  };

  const updateReturn = async (returnId, status) => {
    await axios.put(`/api/returns/admin/${returnId}`, { status }, config);
    await loadCommerce();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <Link to="/admin" className="inline-flex items-center text-sm font-semibold text-brand-primary">
          <ArrowLeft size={16} className="mr-2" /> Back to Admin
        </Link>
        <div className="mt-6 rounded-[32px] bg-brand-dark px-6 py-10 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-accent">Commerce Operations</p>
          <h1 className="mt-3 font-serif text-4xl font-bold">Promotions, Inventory, Reviews, Returns</h1>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Low Stock Alerts</h2>
            <div className="mt-4 space-y-3">
              {lowStock.length === 0 ? <p className="text-sm text-gray-500">No low-stock products.</p> : lowStock.map((product) => (
                <div key={product._id} className="rounded-2xl bg-brand-light p-4 text-sm">
                  <p className="font-semibold text-brand-dark">{product.name}</p>
                  <p className="text-gray-600">On hand: {product.countInStock} | Reserved: {product.reservedStock || 0} | Threshold: {product.lowStockThreshold}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Inventory History</h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {inventoryEvents.slice(0, 20).map((event) => (
                <div key={event._id} className="rounded-2xl bg-brand-light p-4 text-sm">
                  <p className="font-semibold text-brand-dark">{event.product?.name || 'Product'} - {event.type}</p>
                  <p className="text-gray-600">Qty {event.quantity} | {event.previousStock} {'->'} {event.nextStock}</p>
                  <p className="text-xs text-gray-500">{event.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Coupons</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Code" value={couponForm.code} onChange={(value) => setCouponForm((form) => ({ ...form, code: value.toUpperCase() }))} />
              <Field label="Discount Value" type="number" value={couponForm.discountValue} onChange={(value) => setCouponForm((form) => ({ ...form, discountValue: value }))} />
              <Field label="Min Subtotal" type="number" value={couponForm.minSubtotal} onChange={(value) => setCouponForm((form) => ({ ...form, minSubtotal: value }))} />
              <button onClick={() => submitForm('/api/admin/commerce/coupons', couponForm, 'Coupon')} className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
                <Save size={15} className="mr-2" /> Save Coupon
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">{coupons.length} coupons configured.</p>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Gift Cards</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Code" value={giftCardForm.code} onChange={(value) => setGiftCardForm((form) => ({ ...form, code: value.toUpperCase() }))} />
              <Field label="Balance" type="number" value={giftCardForm.balance} onChange={(value) => setGiftCardForm((form) => ({ ...form, balance: value }))} />
              <Field label="Currency" value={giftCardForm.currency} onChange={(value) => setGiftCardForm((form) => ({ ...form, currency: value.toUpperCase() }))} />
              <button onClick={() => submitForm('/api/admin/commerce/gift-cards', giftCardForm, 'Gift card')} className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
                <Save size={15} className="mr-2" /> Save Gift Card
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">{giftCards.length} gift cards configured.</p>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Tax Rules</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Country" value={taxForm.country} onChange={(value) => setTaxForm((form) => ({ ...form, country: value.toUpperCase() }))} />
              <Field label="State" value={taxForm.state} onChange={(value) => setTaxForm((form) => ({ ...form, state: value.toUpperCase() }))} />
              <Field label="Rate" type="number" value={taxForm.rate} onChange={(value) => setTaxForm((form) => ({ ...form, rate: value }))} />
              <button onClick={() => submitForm('/api/admin/commerce/tax-rules', taxForm, 'Tax rule')} className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
                <Save size={15} className="mr-2" /> Save Tax
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">{taxRules.length} tax rules configured.</p>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Shipping Rates</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Carrier" value={shippingForm.carrier} onChange={(value) => setShippingForm((form) => ({ ...form, carrier: value }))} />
              <Field label="Service" value={shippingForm.service} onChange={(value) => setShippingForm((form) => ({ ...form, service: value }))} />
              <Field label="Base Price" type="number" value={shippingForm.basePrice} onChange={(value) => setShippingForm((form) => ({ ...form, basePrice: value }))} />
              <Field label="Free Threshold" type="number" value={shippingForm.freeShippingThreshold} onChange={(value) => setShippingForm((form) => ({ ...form, freeShippingThreshold: value }))} />
              <button onClick={() => submitForm('/api/admin/commerce/shipping-rates', shippingForm, 'Shipping rate')} className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
                <Save size={15} className="mr-2" /> Save Shipping
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">{shippingRates.length} shipping rates configured.</p>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Review Moderation</h2>
            <div className="mt-4 space-y-3">
              {reviews.slice(0, 10).map((review) => (
                <div key={review._id} className="rounded-2xl bg-brand-light p-4 text-sm">
                  <p className="font-semibold text-brand-dark">{review.product?.name || 'Product'} - {review.rating}/5</p>
                  <p className="mt-1 text-gray-600">{review.comment}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => moderateReview(review._id, 'Approved')} className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Approve</button>
                    <button onClick={() => moderateReview(review._id, 'Rejected')} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Returns / RMA</h2>
            <div className="mt-4 space-y-3">
              {returns.slice(0, 10).map((returnRequest) => (
                <div key={returnRequest._id} className="rounded-2xl bg-brand-light p-4 text-sm">
                  <p className="font-semibold text-brand-dark">{returnRequest.user?.email || 'Customer'} - {returnRequest.status}</p>
                  <p className="mt-1 text-gray-600">{returnRequest.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Approved', 'Rejected', 'Received', 'Refunded', 'Closed'].map((status) => (
                      <button key={status} onClick={() => updateReturn(returnRequest._id, status)} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-primary">{status}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminCommercePage;
