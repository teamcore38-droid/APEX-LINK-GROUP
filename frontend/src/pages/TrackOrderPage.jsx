import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, CreditCard, Loader2, MapPin, Phone, Search, Truck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import {
  buildOrderTimeline,
  getEstimatedDeliveryLabel,
  getShippingAddressLines,
  normalizeShippingAddress,
} from '../utils/orderUi';
import {
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
} from '../utils/orderStatus';
import OrderTimeline from '../components/OrderTimeline';

const TrackOrderPage = () => {
  const { userInfo } = useAuth();
  const resultsSectionRef = useRef(null);

  const [recentOrders, setRecentOrders] = useState([]);
  const [form, setForm] = useState({
    orderId: '',
    email: userInfo?.email || '',
    phone: userInfo?.phone || '',
  });
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isLookupExpandedMobile, setIsLookupExpandedMobile] = useState(false);

  useEffect(() => {
    if (!userInfo?.token) {
      return;
    }

    const loadRecentOrders = async () => {
      setLoadingRecent(true);

      try {
        const { data } = await axios.get('/api/orders/myorders', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        setRecentOrders(data.slice(0, 5));
        setForm((currentForm) => ({
          ...currentForm,
          email: userInfo.email || currentForm.email,
          phone: userInfo.phone || currentForm.phone,
        }));
      } catch {
        // Keep the UI resilient if recent orders fail to load.
      } finally {
        setLoadingRecent(false);
      }
    };

    loadRecentOrders();
  }, [userInfo]);

  const estimatedLabel = useMemo(() => {
    if (!result) {
      return '';
    }

    if (result.estimatedDelivery?.start && result.estimatedDelivery?.end) {
      return `${new Date(result.estimatedDelivery.start).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${new Date(result.estimatedDelivery.end).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }

    return getEstimatedDeliveryLabel(result.createdAt);
  }, [result]);

  const normalizedShippingAddress = useMemo(
    () => normalizeShippingAddress(result?.shippingAddress),
    [result]
  );
  const shippingLines = useMemo(
    () => getShippingAddressLines(result?.shippingAddress),
    [result]
  );
  const timeline = useMemo(() => buildOrderTimeline(result || {}), [result]);

  const submitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const config = userInfo?.token
        ? {
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          }
        : undefined;

      const { data } = await axios.post('/api/orders/track', form, config);
      setResult(data);
      setIsLookupExpandedMobile(false);

      // Smooth scroll to tracking results
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to locate tracking details.');
    } finally {
      setLoading(false);
    }
  };

  const renderLookupForm = () => (
    <div className="space-y-5">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Tracking Lookup</p>
      <h2 className="font-serif text-2xl font-bold text-brand-dark sm:text-3xl">Find your order</h2>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 break-words">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={submitHandler}>
        <div>
          <label htmlFor="track-order-id" className="mb-2 block text-sm font-semibold text-brand-dark">
            Order ID
          </label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="track-order-id"
              name="orderId"
              type="text"
              required
              value={form.orderId}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, orderId: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
              placeholder="Paste your order ID"
            />
          </div>
        </div>

        <div>
          <label htmlFor="track-order-email" className="mb-2 block text-sm font-semibold text-brand-dark">
            Email Address
          </label>
          <input
            id="track-order-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
            className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
            placeholder="Use the email placed on the order"
          />
        </div>

        <div>
          <label htmlFor="track-order-phone" className="mb-2 block text-sm font-semibold text-brand-dark">
            Phone Number
          </label>
          <input
            id="track-order-phone"
            name="phone"
            type="text"
            value={form.phone}
            onChange={(event) => setForm((currentForm) => ({ ...currentForm, phone: event.target.value }))}
            className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
            placeholder="Optional alternative to email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
            loading ? 'cursor-not-allowed opacity-70' : ''
          }`}
        >
          {loading ? 'Checking Status...' : 'Track Order'}
        </button>
      </form>

      {userInfo && (
        <div className="rounded-[24px] bg-brand-light p-4 sm:p-5 min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Recent Orders</p>
          {loadingRecent ? (
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Loader2 size={16} className="mr-2 animate-spin" /> Loading recent orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Your recent orders will appear here once you place them.
            </p>
          ) : (
            <div className="mt-4 space-y-3 min-w-0">
              {recentOrders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() =>
                    setForm({
                      orderId: order._id,
                      email: userInfo.email || '',
                      phone: userInfo.phone || '',
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-3 text-left transition-colors duration-200 hover:bg-[#fbf3ea] min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold text-brand-primary truncate">{order._id}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-dark shrink-0">
                    {formatCurrency(order.totalPrice)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderResultsSection = () => (
    <div ref={resultsSectionRef} className="scroll-mt-6 min-w-0">
      {!result ? (
        <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-[24px] border border-dashed border-brand-accent/30 bg-brand-light px-4 py-8 text-center sm:px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
            <Truck size={28} />
          </div>
          <p className="mt-6 font-serif text-2xl font-bold text-brand-dark sm:text-3xl">Tracking details will appear here</p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
            Enter your order ID and matching email address to view fulfillment progress, payment confirmation, and dispatch notes.
          </p>
        </div>
      ) : (
        <div className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Tracking Result</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-brand-dark sm:text-3xl break-all">
                Order {result._id}
              </h2>
            </div>
            <p className="rounded-full bg-brand-light px-4 py-2 text-xs font-semibold text-brand-dark sm:text-sm shrink-0">
              Total {formatCurrency(result.totalPrice)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 min-w-0">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusBadgeClass(result.orderStatus)}`}>
              {result.orderStatus}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(result)}`}>
              {getPaymentLabel(result)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(result.isDelivered, result.orderStatus)}`}>
              {getDeliveryLabel(result.isDelivered, result.orderStatus)}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 min-w-0">
            <div className="rounded-[24px] bg-brand-light p-4 sm:p-5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent sm:text-xs">Tracking Number</p>
              <p className="mt-2 font-serif text-lg font-bold text-brand-dark sm:text-2xl break-all">
                {result.trackingNumber || 'Pending assignment'}
              </p>
            </div>
            <div className="rounded-[24px] bg-brand-light p-4 sm:p-5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent sm:text-xs">Estimated Delivery</p>
              <p className="mt-2 font-serif text-lg font-bold text-brand-dark sm:text-2xl break-words">{estimatedLabel}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-100 p-4 sm:p-5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent sm:text-xs">Delivery Note</p>
            <p className="mt-2 text-sm leading-6 text-gray-600 break-words">
              {result.deliveryNote || 'No delivery note has been added yet.'}
            </p>
          </div>

          {(result.courierName || result.trackingUrl || result.shipmentUpdates?.length > 0) && (
            <div className="rounded-[24px] border border-gray-100 p-4 sm:p-5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent sm:text-xs">Courier Updates</p>
              {result.courierName && (
                <p className="mt-2 text-sm font-semibold text-brand-dark break-words">
                  {result.courierName}
                  {result.trackingUrl && (
                    <a href={result.trackingUrl} target="_blank" rel="noreferrer" className="ml-3 text-brand-primary underline break-all">
                      Track with courier
                    </a>
                  )}
                </p>
              )}
              <div className="mt-3 space-y-3 min-w-0">
                {(result.shipmentUpdates || []).slice().reverse().map((update, index) => (
                  <div key={`${update.occurredAt}-${index}`} className="rounded-2xl bg-brand-light p-3.5 text-sm min-w-0">
                    <p className="font-semibold text-brand-dark break-words">{update.status || 'Shipment update'}</p>
                    <p className="mt-1 text-gray-600 break-words">{update.message || update.location || 'Courier update recorded.'}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {update.courier || result.courierName || 'Courier'} - {new Date(update.occurredAt || update.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.cancellationRequests?.length > 0 && (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4 sm:p-5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 sm:text-xs">Cancellation Requests</p>
              <div className="mt-2 space-y-2 min-w-0">
                {result.cancellationRequests.map((request) => (
                  <div key={request._id || request.createdAt} className="text-sm text-amber-900 break-words">
                    <span className="font-semibold">{request.status}</span> - {request.reason}
                    {request.adminNote && <span> ({request.adminNote})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 min-w-0">
            <div className="rounded-[24px] border border-gray-100 bg-[#fffaf4] p-4 sm:p-5 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-2xl bg-brand-light p-2.5 text-brand-primary shrink-0">
                  <UserRound size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent">Contact</p>
                  <h3 className="font-serif text-lg font-bold text-brand-dark sm:text-xl truncate">Delivery contact</h3>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600 min-w-0">
                <div className="rounded-2xl bg-brand-light p-3.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Full Name</p>
                  <p className="mt-1 font-semibold text-brand-dark break-words">
                    {normalizedShippingAddress.fullName || 'Available after order processing'}
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-light p-3.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Email</p>
                  <p className="mt-1 font-semibold text-brand-dark break-all">
                    {normalizedShippingAddress.email || 'Hidden for privacy'}
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-light p-3.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-500" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Phone</p>
                  </div>
                  <p className="mt-1 font-semibold text-brand-dark break-all">
                    {normalizedShippingAddress.phone || 'Hidden for privacy'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-100 bg-[#fffaf4] p-4 sm:p-5 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-2xl bg-brand-light p-2.5 text-brand-primary shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent">Shipping Address</p>
                  <h3 className="font-serif text-lg font-bold text-brand-dark sm:text-xl truncate">Destination</h3>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-brand-light p-3.5 text-sm leading-6 text-gray-600 min-w-0 break-words">
                {shippingLines.length > 0 ? (
                  shippingLines.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p>Shipping details are not available for this order yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <MapPin size={18} className="text-brand-accent shrink-0" />
              <h3 className="font-serif text-xl font-bold text-brand-dark sm:text-2xl">Ordered Items</h3>
            </div>
            <div className="mt-4 space-y-3 min-w-0">
              {result.items.map((item) => (
                <article
                  key={`${item.name}-${item.image}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] border border-gray-100 bg-[#fffaf4] p-3.5 sm:p-4 min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.image} alt={item.name} className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-serif text-base font-bold text-brand-dark sm:text-lg break-words">{item.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                        <span>Qty: {item.qty}</span>
                        {item.size && (
                          <span className="rounded-md bg-[#f5e9dd] px-2 py-0.5 text-[10px] font-bold text-[#744126]">
                            Size: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="rounded-md bg-[#efebe6] px-2 py-0.5 text-[10px] font-bold text-[#4a3b32]">
                            Color: {item.color}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-brand-dark shrink-0 sm:text-right">{formatCurrency(item.price)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-100 bg-[#fffaf4] p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-2xl bg-brand-light p-2.5 text-brand-primary shrink-0">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent">Order Summary</p>
                <h3 className="font-serif text-lg font-bold text-brand-dark sm:text-xl">Totals</h3>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-sm text-gray-600 min-w-0">
              <div className="flex justify-between">
                <span>Items subtotal</span>
                <span className="font-semibold text-brand-dark">{formatCurrency(result.itemsPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-brand-dark">{formatCurrency(result.shippingPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-semibold text-brand-dark">{formatCurrency(result.taxPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Provider</span>
                <span className="font-semibold text-brand-dark">{result.paymentProvider || 'Manual'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="font-semibold text-brand-dark">{result.paymentMethod || 'Not available'}</span>
              </div>
              <div className="flex justify-between border-t border-dashed pt-3 font-serif text-lg font-bold text-brand-dark sm:text-xl">
                <span>Total</span>
                <span className="text-brand-primary">{formatCurrency(result.totalPrice || 0)}</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-x-hidden">
            <OrderTimeline timeline={timeline} title="Shipment timeline" />
          </div>

          {result.canViewFullDetails && (
            <div className="flex flex-col sm:flex-row gap-3 min-w-0 pt-2">
              <Link
                to={`/orders/${result._id}`}
                className="inline-flex w-full sm:w-auto justify-center items-center rounded-xl bg-brand-primary px-5 py-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-brand-dark"
              >
                View Full Order Details
              </Link>
              <Link
                to={`/orders/${result._id}/invoice`}
                className="inline-flex w-full sm:w-auto justify-center items-center rounded-xl border border-brand-primary/20 px-5 py-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                View Invoice
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fff7ee] pt-2 sm:pt-4 pb-12 overflow-x-hidden">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 min-w-0">
        <div className="rounded-2xl bg-brand-dark px-5 py-4 text-white shadow-lg sm:px-8 sm:py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-accent sm:text-xs">Track Order</p>
          <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">Follow your shipment</h1>
        </div>

        {/* Desktop View Layout (xl:grid) */}
        <div className="mt-4 hidden xl:grid xl:grid-cols-[380px_minmax(0,1fr)] gap-6 min-w-0">
          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53,26,17,0.08)] h-fit">
            {renderLookupForm()}
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53,26,17,0.08)] sm:p-8 min-w-0">
            {renderResultsSection()}
          </section>
        </div>

        {/* Mobile / Tablet View Layout (xl:hidden) */}
        <div className="mt-4 space-y-6 xl:hidden min-w-0">
          {result ? (
            <>
              {/* On mobile when tracking result exists: Results appear FIRST at top */}
              <section className="rounded-[24px] bg-white p-5 shadow-[0_18px_40px_rgba(53,26,17,0.08)] min-w-0">
                {renderResultsSection()}
              </section>

              {/* Compact Collapsible "Track Another Order" Card */}
              <section className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_18px_40px_rgba(53,26,17,0.08)] transition-all duration-200 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsLookupExpandedMobile((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left transition-colors duration-200"
                  aria-expanded={isLookupExpandedMobile}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand-accent shrink-0">
                      <Search size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent">Lookup</p>
                      <span className="font-serif text-base font-bold text-brand-dark truncate">Track Another Order</span>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-brand-accent transition-transform duration-300 shrink-0 ${
                      isLookupExpandedMobile ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isLookupExpandedMobile && (
                  <div className="mt-4 border-t border-gray-100 pt-4 animate-in fade-in slide-in-from-top-1 min-w-0">
                    {renderLookupForm()}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* When no result exists: Render full Order Lookup Form */
            <section className="rounded-[24px] bg-white p-5 shadow-[0_18px_40px_rgba(53,26,17,0.08)] min-w-0">
              {renderLookupForm()}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
