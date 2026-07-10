import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Download,
  MapPin,
  Printer,
  Package,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import {
  buildOrderTimeline,
  getCustomerContactDetails,
  getShippingAddressLines,
} from '../utils/orderUi';
import {
  ORDER_STATUS_OPTIONS,
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
  getRefundBadgeClass,
} from '../utils/orderStatus';
import OrderTimeline from '../components/OrderTimeline';
import CustomSelect from '../components/CustomSelect';

const buildFormState = (order) => ({
  orderStatus: order?.orderStatus || 'Processing',
  isPaid: Boolean(order?.isPaid),
  isDelivered: Boolean(order?.isDelivered),
  trackingNumber: order?.trackingNumber || '',
  courierName: order?.courierName || '',
  trackingUrl: order?.trackingUrl || '',
  deliveryNote: order?.deliveryNote || '',
});

const formatDate = (value) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [order, setOrder] = useState(null);
  const [formData, setFormData] = useState(buildFormState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSaving, setRefundSaving] = useState(false);
  const [paymentEvents, setPaymentEvents] = useState([]);
  const [paymentEventsLoading, setPaymentEventsLoading] = useState(false);
  const [paymentEventsRefreshToken, setPaymentEventsRefreshToken] = useState(0);
  const [shipmentForm, setShipmentForm] = useState({ status: 'Shipped', location: '', message: '' });

  const customerContact = getCustomerContactDetails(order || {});
  const shippingLines = getShippingAddressLines(order?.shippingAddress, order?.user);
  const timeline = buildOrderTimeline(order || {});

  useEffect(() => {
    if (!userInfo?.token) {
      navigate(`/login?redirect=/admin/orders/${id}`);
      return;
    }

    if (!userInfo.isAdmin && !userInfo.permissions?.includes('orders:read')) {
      navigate('/profile');
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      setError('');

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const { data } = await axios.get(`/api/orders/${id}`, config);
        setOrder(data);
        setFormData(buildFormState(data));
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate, userInfo]);

  useEffect(() => {
    if (!userInfo?.token || (!userInfo.isAdmin && !userInfo.permissions?.includes('orders:read')) || !order?._id) {
      return;
    }

    const fetchPaymentEvents = async () => {
      setPaymentEventsLoading(true);

      try {
        const { data } = await axios.get(`/api/payments/admin/order/${order._id}/events`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setPaymentEvents(data);
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setPaymentEventsLoading(false);
      }
    };

    fetchPaymentEvents();
  }, [order?._id, paymentEventsRefreshToken, userInfo]);

  const amountPaid = Number(order?.paymentResult?.amountReceived || order?.totalPrice || 0);
  const refundedAmount = Number(order?.refundedAmount || 0);
  const refundableAmount = Math.max(amountPaid - refundedAmount, 0);
  const stripeRefundAvailable = Boolean(order?.paymentProvider === 'Stripe' && (order?.paymentIntentId || order?.paymentResult?.chargeId));
  const refundDisabled = !order?.isPaid || refundableAmount <= 0 || !stripeRefundAvailable || refundSaving;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setSuccessMessage('');
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleBooleanChange = (name, value) => {
    setSuccessMessage('');
    setFormData((current) => ({
      ...current,
      [name]: value === 'true',
    }));
  };

  const handleSelectChange = (name, value) => {
    setSuccessMessage('');
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    if (!userInfo?.token) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      const payload = {
        orderStatus: formData.orderStatus,
        isPaid: formData.isPaid,
        isDelivered: formData.isDelivered,
        trackingNumber: formData.trackingNumber,
        courierName: formData.courierName,
        trackingUrl: formData.trackingUrl,
        deliveryNote: formData.deliveryNote,
      };

      const { data } = await axios.put(`/api/orders/${id}/status`, payload, config);

      setOrder(data);
      setFormData(buildFormState(data));
      setSuccessMessage('Order updated successfully.');
      setPaymentEventsRefreshToken((currentToken) => currentToken + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update this order.');
    } finally {
      setSaving(false);
    }
  };

  const publishShipmentUpdate = async () => {
    if (!userInfo?.token || !order?._id) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await axios.post(
        `/api/orders/${order._id}/shipment-updates`,
        {
          courier: formData.courierName,
          trackingNumber: formData.trackingNumber,
          trackingUrl: formData.trackingUrl,
          ...shipmentForm,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setOrder(data);
      setFormData(buildFormState(data));
      setSuccessMessage('Shipment update published.');
    } catch (shipmentError) {
      setError(shipmentError.response?.data?.message || 'Unable to publish shipment update.');
    } finally {
      setSaving(false);
    }
  };

  const reviewCancellationRequest = async (requestId, status) => {
    if (!userInfo?.token || !order?._id) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await axios.put(
        `/api/orders/${order._id}/cancellation-requests/${requestId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setOrder(data);
      setFormData(buildFormState(data));
      setSuccessMessage(`Cancellation request ${status.toLowerCase()}.`);
    } catch (cancelError) {
      setError(cancelError.response?.data?.message || 'Unable to review cancellation request.');
    } finally {
      setSaving(false);
    }
  };

  const submitRefund = async (useFullAmount = false) => {
    if (!userInfo?.token || !order?._id) {
      return;
    }

    const nextAmount = useFullAmount ? refundableAmount : Number(refundAmount || 0);

    if (!useFullAmount && (!Number.isFinite(nextAmount) || nextAmount <= 0)) {
      setError('Please enter a valid refund amount.');
      return;
    }

    const confirmed = window.confirm(
      `Confirm refund of ${formatCurrency(nextAmount)} for order ${order._id}?`
    );

    if (!confirmed) {
      return;
    }

    setRefundSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await axios.post(
        '/api/payments/refund',
        {
          orderId: order._id,
          amount: nextAmount,
          reason: refundReason,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setOrder(data);
      setFormData(buildFormState(data));
      setRefundAmount('');
      setRefundReason('');
      setSuccessMessage(`Refund processed for ${formatCurrency(nextAmount)}.`);
      setPaymentEventsRefreshToken((currentToken) => currentToken + 1);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.response?.data?.message || 'Unable to process refund right now.');
    } finally {
      setRefundSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-brand-light px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent"></div>
        <p className="mt-4 font-serif text-lg text-brand-dark">Loading order management details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">Admin Order Management</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-brand-dark">Unable to load order</h1>
          <p className="mt-3 text-sm text-gray-600">{error}</p>
          <div className="mt-6">
            <Link
              to="/admin"
              className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              <ArrowLeft size={16} className="mr-2" /> Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-light py-10">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
            >
              <ArrowLeft size={16} className="mr-2" /> Back to Admin Dashboard
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/admin/orders/${id}/invoice`}
                className="inline-flex items-center rounded-xl border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                <Download size={13} className="mr-2" /> Invoice
              </Link>
              <Link
                to={`/admin/orders/${id}/packing-slip`}
                className="inline-flex items-center rounded-xl border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                <Printer size={13} className="mr-2" /> Packing Slip
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-brand-accent/15 bg-white shadow-[0_20px_60px_rgba(11,31,58,0.08)]">
          <div className="border-b border-brand-accent/10 bg-gradient-to-r from-brand-dark via-brand-primary to-brand-accent px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">Admin Order Management</p>
                <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Order Details</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/80">
                  Review payment, fulfillment, delivery progress, and customer shipment information from one place.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Order Date</p>
                  <p className="mt-1 text-sm font-semibold">{formatDate(order.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Total</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(order.totalPrice || 0)}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Order ID</p>
                  <p className="mt-1 break-all font-mono text-xs font-semibold">{order._id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.45fr_0.95fr] lg:px-8">
            <div className="space-y-8">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {successMessage}
                </div>
              )}

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Status Overview</p>
                    <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Current order state</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClass(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(order)}`}>
                      {getPaymentLabel(order)}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(order.isDelivered, order.orderStatus)}`}>
                      {getDeliveryLabel(order.isDelivered, order.orderStatus)}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRefundBadgeClass(order.refundStatus)}`}>
                      {order.refundStatus || 'Not Refunded'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Paid At</p>
                    <p className="mt-2 text-sm font-semibold text-brand-dark">{formatDateTime(order.paidAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Delivered At</p>
                    <p className="mt-2 text-sm font-semibold text-brand-dark">{formatDateTime(order.deliveredAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Tracking Number</p>
                    <p className="mt-2 break-all text-sm font-semibold text-brand-dark">
                      {order.trackingNumber || 'Not assigned yet'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                      <UserRound size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Customer</p>
                      <h2 className="font-serif text-xl font-bold text-brand-dark">Buyer information</h2>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl bg-brand-light p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Name</p>
                      <p className="mt-2 text-sm font-semibold text-brand-dark">{customerContact.fullName}</p>
                    </div>
                    <div className="rounded-2xl bg-brand-light p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Email</p>
                      <p className="mt-2 break-all text-sm font-semibold text-brand-dark">{customerContact.email}</p>
                    </div>
                    <div className="rounded-2xl bg-brand-light p-4">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-500" />
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Phone</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-brand-dark">{customerContact.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Shipping</p>
                      <h2 className="font-serif text-xl font-bold text-brand-dark">Delivery address</h2>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-brand-light p-4 text-sm font-medium leading-7 text-brand-dark">
                    {shippingLines.length > 0 ? (
                      shippingLines.map((line) => <p key={line}>{line}</p>)
                    ) : (
                      <p>No shipping address available.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Order Items</p>
                    <h2 className="font-serif text-xl font-bold text-brand-dark">Purchased products</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {order.orderItems?.map((item, index) => (
                    <div
                      key={`${item.product || item.name}-${index}`}
                      className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-20 w-20 rounded-2xl border border-gray-100 object-cover"
                        />
                        <div>
                          <p className="font-serif text-lg font-bold text-brand-dark">{item.name}</p>
                          <p className="mt-1 text-sm text-gray-500">Quantity: {item.qty}</p>
                          <p className="text-sm text-gray-500">Unit Price: {formatCurrency(item.price)}</p>
                        </div>
                      </div>
                      <p className="font-serif text-xl font-bold text-brand-primary">
                        {formatCurrency(item.qty * item.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Admin Controls</p>
                    <h2 className="font-serif text-xl font-bold text-brand-dark">Manage this order</h2>
                  </div>
                </div>

                <form className="mt-6 space-y-5" onSubmit={submitHandler}>
                  <div>
                    <label htmlFor="orderStatus" className="mb-2 block text-sm font-semibold text-brand-dark">
                      Order Status
                    </label>
                    <CustomSelect
                      id="orderStatus"
                      value={formData.orderStatus}
                      onChange={(nextValue) => handleSelectChange('orderStatus', nextValue)}
                      options={ORDER_STATUS_OPTIONS.map((status) => ({
                        value: status,
                        label: status,
                      }))}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="paymentStatus" className="mb-2 block text-sm font-semibold text-brand-dark">
                        Payment Status
                      </label>
                      <CustomSelect
                        id="paymentStatus"
                        value={String(formData.isPaid)}
                        onChange={(nextValue) => handleBooleanChange('isPaid', nextValue)}
                        options={[
                          { value: 'false', label: 'Unpaid' },
                          { value: 'true', label: 'Paid' },
                        ]}
                      />
                    </div>

                    <div>
                      <label htmlFor="deliveryStatus" className="mb-2 block text-sm font-semibold text-brand-dark">
                        Delivery Status
                      </label>
                      <CustomSelect
                        id="deliveryStatus"
                        value={String(formData.isDelivered)}
                        onChange={(nextValue) => handleBooleanChange('isDelivered', nextValue)}
                        options={[
                          { value: 'false', label: 'Not Delivered' },
                          { value: 'true', label: 'Delivered' },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="trackingNumber" className="mb-2 block text-sm font-semibold text-brand-dark">
                      Tracking Number
                    </label>
                    <input
                      id="trackingNumber"
                      name="trackingNumber"
                      type="text"
                      value={formData.trackingNumber}
                      onChange={handleChange}
                      placeholder="Enter shipment tracking reference"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="courierName" className="mb-2 block text-sm font-semibold text-brand-dark">
                        Courier
                      </label>
                      <input
                        id="courierName"
                        name="courierName"
                        type="text"
                        value={formData.courierName}
                        onChange={handleChange}
                        placeholder="DHL, FedEx, Apex Logistics"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                      />
                    </div>
                    <div>
                      <label htmlFor="trackingUrl" className="mb-2 block text-sm font-semibold text-brand-dark">
                        Tracking URL
                      </label>
                      <input
                        id="trackingUrl"
                        name="trackingUrl"
                        type="text"
                        value={formData.trackingUrl}
                        onChange={handleChange}
                        placeholder="https://courier.example/track"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-accent/20 bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Courier Update</p>
                    <div className="mt-3 grid gap-3">
                      <CustomSelect
                        value={shipmentForm.status}
                        onChange={(nextValue) => setShipmentForm((form) => ({ ...form, status: nextValue }))}
                        options={ORDER_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                      />
                      <input
                        value={shipmentForm.location}
                        onChange={(event) => setShipmentForm((form) => ({ ...form, location: event.target.value }))}
                        placeholder="Current location"
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                      />
                      <textarea
                        value={shipmentForm.message}
                        onChange={(event) => setShipmentForm((form) => ({ ...form, message: event.target.value }))}
                        placeholder="Courier update message"
                        rows={3}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={publishShipmentUpdate}
                        className="self-start rounded-xl border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary hover:bg-brand-primary hover:text-white"
                      >
                        Publish Shipment Update
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="deliveryNote" className="mb-2 block text-sm font-semibold text-brand-dark">
                      Delivery / Admin Note
                    </label>
                    <textarea
                      id="deliveryNote"
                      name="deliveryNote"
                      rows="5"
                      value={formData.deliveryNote}
                      onChange={handleChange}
                      placeholder="Add a delivery note, courier update, or internal fulfillment comment"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save size={16} className="mr-2" />
                    {saving ? 'Saving Changes...' : 'Save / Update Order'}
                  </button>
                </form>

                {order.cancellationRequests?.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Cancellation Requests</p>
                    <div className="mt-3 space-y-3">
                      {order.cancellationRequests.map((request) => (
                        <div key={request._id || request.createdAt} className="rounded-xl bg-white p-3 text-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-brand-dark">{request.status}</p>
                              <p className="mt-1 text-gray-600">{request.reason}</p>
                              <p className="mt-1 text-xs text-gray-500">{request.requesterEmail}</p>
                            </div>
                            {request.status === 'Pending' && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => reviewCancellationRequest(request._id, 'Approved')}
                                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => reviewCancellationRequest(request._id, 'Rejected')}
                                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Billing Summary</p>
                    <h2 className="font-serif text-xl font-bold text-brand-dark">Totals and payment</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(order.itemsPrice || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping Price</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(order.shippingPrice || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax Price</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(order.taxPrice || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 font-serif text-xl font-bold text-brand-dark">
                    <span>Total Price</span>
                    <span className="text-brand-primary">{formatCurrency(order.totalPrice || 0)}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Payment Method</p>
                  <p className="mt-2 text-sm font-semibold text-brand-dark">{order.paymentMethod || 'Not available'}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Payment Provider</p>
                  <p className="mt-2 text-sm font-semibold text-brand-dark">{order.paymentProvider || 'Manual'}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Payment Status</p>
                  <p className="mt-2 text-sm font-semibold text-brand-dark">{getPaymentLabel(order)}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Payment Intent ID</p>
                  <p className="mt-2 break-all text-sm font-semibold text-brand-dark">
                    {order.paymentIntentId || 'Not available'}
                  </p>
                </div>
                <div className="mt-4 rounded-2xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Payment Result</p>
                  <div className="mt-2 space-y-1 text-sm text-brand-dark">
                    <p>Status: {order.paymentResult?.status || 'Not available'}</p>
                    <p>Amount Received: {formatCurrency(order.paymentResult?.amountReceived || 0)}</p>
                    <p>Method Type: {order.paymentResult?.paymentMethodType || 'Not available'}</p>
                    <p>Receipt Email: {order.paymentResult?.receiptEmail || 'Not available'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Refund Management</p>
                    <h2 className="font-serif text-xl font-bold text-brand-dark">Process refunds safely</h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between rounded-2xl bg-brand-light p-3">
                    <span>Total Paid</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-brand-light p-3">
                    <span>Already Refunded</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(refundedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-brand-light p-3">
                    <span>Refundable Balance</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(refundableAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-brand-light p-3">
                    <span>Refund Status</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${getRefundBadgeClass(order.refundStatus)}`}>
                      {order.refundStatus || 'Not Refunded'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-brand-dark">Refund Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={refundAmount}
                      onChange={(event) => setRefundAmount(event.target.value)}
                      disabled={refundDisabled}
                      placeholder={refundableAmount > 0 ? `Up to ${refundableAmount.toFixed(2)}` : 'No refundable balance'}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-brand-dark">Refund Reason (optional)</label>
                    <input
                      type="text"
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                      disabled={refundDisabled}
                      placeholder="duplicate, requested_by_customer, or internal note"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={refundDisabled}
                      onClick={() => submitRefund(false)}
                      className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {refundSaving ? 'Processing...' : 'Submit Refund'}
                    </button>
                    <button
                      type="button"
                      disabled={refundDisabled}
                      onClick={() => submitRefund(true)}
                      className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {refundSaving ? 'Processing...' : 'Full Refund'}
                    </button>
                  </div>

                  {(!order.isPaid || !stripeRefundAvailable) && (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Refund is available only for paid Stripe orders with a valid payment reference.
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Refund History</p>
                  {order.refundHistory?.length ? (
                    <div className="mt-3 space-y-3">
                      {order.refundHistory.map((entry) => (
                        <div key={entry.refundId || entry.createdAt} className="rounded-2xl bg-brand-light p-3 text-sm text-gray-700">
                          <p className="font-semibold text-brand-dark">
                            {formatCurrency(entry.amount || 0)} • {entry.status || 'updated'}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-US') : 'No timestamp'}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 break-all">Refund ID: {entry.refundId || 'N/A'}</p>
                          <p className="mt-1 text-xs text-gray-600">Reason: {entry.reason || 'Not specified'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">No refund events have been recorded for this order.</p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Payment Audit</p>
                    <h2 className="font-serif text-xl font-bold text-brand-dark">Stripe and reconciliation events</h2>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-brand-light p-4 text-xs text-gray-700">
                  <p>Provider: <span className="font-semibold text-brand-dark">{order.paymentProvider || 'Manual'}</span></p>
                  <p className="mt-1 break-all">Payment Intent: <span className="font-semibold text-brand-dark">{order.paymentIntentId || 'Not available'}</span></p>
                  <p className="mt-1">Payment Status: <span className="font-semibold text-brand-dark">{getPaymentLabel(order)}</span></p>
                  <p className="mt-1">Paid Date: <span className="font-semibold text-brand-dark">{formatDateTime(order.paidAt)}</span></p>
                  <p className="mt-1">Payment Result: <span className="font-semibold text-brand-dark">{order.paymentResult?.status || 'Not available'}</span></p>
                  <p className="mt-1">Refund Status: <span className="font-semibold text-brand-dark">{order.refundStatus || 'Not Refunded'}</span></p>
                  <p className="mt-1">Refunded Amount: <span className="font-semibold text-brand-dark">{formatCurrency(order.refundedAmount || 0)}</span></p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Webhook Events</p>
                  {paymentEventsLoading ? (
                    <p className="mt-3 text-sm text-gray-500">Loading webhook events...</p>
                  ) : paymentEvents.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No webhook events recorded for this order yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {paymentEvents.slice(0, 15).map((event) => (
                        <div key={event.eventId} className="rounded-2xl border border-gray-100 bg-white p-3 text-xs text-gray-700">
                          <p className="font-semibold text-brand-dark">{event.type}</p>
                          <p className="mt-1 break-all text-gray-500">Event ID: {event.eventId}</p>
                          <p className="mt-1 text-gray-500">
                            {event.createdAt
                              ? new Date(event.createdAt).toLocaleString('en-US')
                              : 'No timestamp'}
                          </p>
                          {event.processingError && (
                            <p className="mt-1 text-red-700">Note: {event.processingError}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-accent/10 p-3 text-brand-accent">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Fulfillment Notes</p>
                    <h2 className="font-serif text-xl font-bold text-brand-dark">Shipment context</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Tracking Number</p>
                    <p className="mt-2 break-all text-sm font-semibold text-brand-dark">
                      {order.trackingNumber || 'Not assigned yet'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Delivery / Admin Note</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-dark">
                      {order.deliveryNote || 'No delivery note has been added yet.'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-brand-light p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar size={16} />
                      <p className="text-xs font-bold uppercase tracking-[0.18em]">Last Activity</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-brand-dark">{formatDateTime(order.updatedAt)}</p>
                  </div>
                </div>
              </section>

              <OrderTimeline timeline={timeline} title="Fulfillment timeline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;
