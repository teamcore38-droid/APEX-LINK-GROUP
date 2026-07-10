import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Loader2, PackageCheck, Send, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';

const AdminVendorsPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const canManageVendors = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('vendors:manage') ||
      userInfo?.permissions?.includes('*')
  );
  const [vendors, setVendors] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionKey, setActionKey] = useState('');
  const [rfqAssignments, setRfqAssignments] = useState({});
  const [payoutVendorId, setPayoutVendorId] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('Pending');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${userInfo?.token}`,
        'Content-Type': 'application/json',
      },
    }),
    [userInfo?.token]
  );

  const loadMarketplace = useCallback(async () => {
    if (!userInfo?.token || !canManageVendors) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [vendorRes, submissionRes, rfqRes, payoutRes, orderRes] = await Promise.all([
        axios.get('/api/vendors/admin/all', config),
        axios.get('/api/vendors/admin/submissions', config),
        axios.get('/api/rfqs/admin/all', config),
        axios.get('/api/vendors/admin/payouts', config),
        axios.get('/api/vendors/admin/orders', config),
      ]);

      setVendors(vendorRes.data);
      setSubmissions(submissionRes.data);
      setRfqs(rfqRes.data);
      setPayouts(payoutRes.data);
      setVendorOrders(orderRes.data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load marketplace operations.');
    } finally {
      setLoading(false);
    }
  }, [canManageVendors, config, userInfo]);

  useEffect(() => {
    if (!userInfo?.token || !canManageVendors) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      loadMarketplace();
    }, 0);

    return () => clearTimeout(timer);
  }, [canManageVendors, loadMarketplace, navigate, userInfo]);

  const runAction = async (key, action, successMessage) => {
    setActionKey(key);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadMarketplace();
    } catch (actionError) {
      console.error(actionError);
      setError(actionError.response?.data?.message || 'Marketplace action failed.');
    } finally {
      setActionKey('');
    }
  };

  const reviewVendor = (vendor, status) =>
    runAction(
      `${vendor._id}:${status}`,
      () =>
        axios.put(
          `/api/vendors/admin/${vendor._id}/review`,
          {
            status,
            commissionRate: vendor.commissionRate ?? 10,
          },
          config
        ),
      `Vendor marked ${status}.`
    );

  const reviewSubmission = (submission, status) =>
    runAction(
      `${submission._id}:${status}`,
      () =>
        axios.put(
          `/api/vendors/admin/submissions/${submission._id}/review`,
          { status },
          config
        ),
      `Submission marked ${status}.`
    );

  const assignRfq = (rfq) => {
    const selectedIds = (rfqAssignments[rfq._id] || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return runAction(
      `${rfq._id}:assign`,
      () =>
        axios.put(
          `/api/rfqs/admin/${rfq._id}`,
          {
            assignedVendorIds: selectedIds,
            status: selectedIds.length > 0 ? 'Sent to Vendors' : rfq.status,
          },
          config
        ),
      'RFQ assignment updated.'
    );
  };

  const createPayout = () => {
    if (!payoutVendorId) {
      setError('Choose a vendor for payout.');
      return;
    }

    runAction(
      `payout:${payoutVendorId}`,
      () =>
        axios.post(
          '/api/vendors/admin/payouts',
          {
            vendorId: payoutVendorId,
            status: payoutStatus,
          },
          config
        ),
      'Payout created.'
    );
  };

  const updatePayout = (payout, status) =>
    runAction(
      `${payout._id}:${status}`,
      () => axios.put(`/api/vendors/admin/payouts/${payout._id}`, { status }, config),
      `Payout marked ${status}.`
    );

  const verifiedVendors = vendors.filter((vendor) => vendor.status === 'Verified');
  const eligibleOrders = vendorOrders.filter((order) => order.payoutStatus === 'Eligible');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Admin</p>
          <h1 className="mt-2 flex items-center text-3xl font-serif font-bold text-brand-dark">
            <Building2 className="mr-3 text-brand-accent" /> Marketplace Operations
          </h1>
        </div>
        {loading && <Loader2 className="animate-spin text-brand-primary" />}
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
      {message && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">{message}</div>}

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          ['Vendors', vendors.length],
          ['Verified', verifiedVendors.length],
          ['Submissions', submissions.length],
          ['Eligible Payouts', eligibleOrders.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-serif font-bold text-brand-dark">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-xl font-serif font-bold text-brand-dark">
            <CheckCircle2 className="mr-2 text-brand-accent" /> Vendor Verification
          </h2>
          <div className="space-y-4">
            {vendors.map((vendor) => (
              <article key={vendor._id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-serif text-lg font-bold text-brand-dark">{vendor.businessName}</p>
                    <p className="text-sm text-gray-500">{vendor.email || vendor.user?.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">
                      {vendor.status} - {vendor.commissionRate}% commission
                    </p>
                    <p className="mt-2 text-xs text-gray-500">ID: {vendor._id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Under Review', 'Verified', 'Rejected', 'Suspended'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={actionKey === `${vendor._id}:${status}`}
                        onClick={() => reviewVendor(vendor, status)}
                        className="rounded-md border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary disabled:opacity-60"
                      >
                        {actionKey === `${vendor._id}:${status}` ? 'Saving' : status}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {vendors.length === 0 && <p className="text-sm text-gray-500">No vendors yet.</p>}
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-xl font-serif font-bold text-brand-dark">
            <PackageCheck className="mr-2 text-brand-accent" /> Product Submissions
          </h2>
          <div className="space-y-4">
            {submissions.map((submission) => (
              <article key={submission._id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-serif text-lg font-bold text-brand-dark">{submission.payload?.name || 'Product submission'}</p>
                    <p className="text-sm text-gray-500">{submission.vendor?.businessName || 'Vendor'} - {submission.status}</p>
                    {submission.reviewNote && <p className="mt-2 text-sm text-gray-500">{submission.reviewNote}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Approved', 'Changes Requested', 'Rejected'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={actionKey === `${submission._id}:${status}`}
                        onClick={() => reviewSubmission(submission, status)}
                        className="rounded-md border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary disabled:opacity-60"
                      >
                        {actionKey === `${submission._id}:${status}` ? 'Saving' : status}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {submissions.length === 0 && <p className="text-sm text-gray-500">No product submissions.</p>}
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-xl font-serif font-bold text-brand-dark">
            <Send className="mr-2 text-brand-accent" /> RFQ Management
          </h2>
          <div className="space-y-4">
            {rfqs.map((rfq) => (
              <article key={rfq._id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg font-bold text-brand-dark">{rfq.productInterest}</p>
                      <p className="text-sm text-gray-500">
                        {rfq.company || rfq.buyerName || rfq.buyer?.name || 'Buyer'} - {rfq.status}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-primary">
                      {rfq.quotes?.length || 0} quotes
                    </span>
                  </div>
                  <input
                    value={rfqAssignments[rfq._id] ?? rfq.assignedVendors?.map((vendor) => vendor._id || vendor).join(',') ?? ''}
                    onChange={(event) =>
                      setRfqAssignments((current) => ({ ...current, [rfq._id]: event.target.value }))
                    }
                    placeholder="Verified vendor IDs, comma separated"
                    className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
                  />
                  <button
                    type="button"
                    disabled={actionKey === `${rfq._id}:assign`}
                    onClick={() => assignRfq(rfq)}
                    className="self-start rounded-md bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white disabled:opacity-60"
                  >
                    Assign Vendors
                  </button>
                </div>
              </article>
            ))}
            {rfqs.length === 0 && <p className="text-sm text-gray-500">No RFQs yet.</p>}
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-xl font-serif font-bold text-brand-dark">
            <WalletCards className="mr-2 text-brand-accent" /> Payout Tracking
          </h2>
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <select
              value={payoutVendorId}
              onChange={(event) => setPayoutVendorId(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
            >
              <option value="">Choose vendor</option>
              {verifiedVendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.businessName}
                </option>
              ))}
            </select>
            <select
              value={payoutStatus}
              onChange={(event) => setPayoutStatus(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
            >
              {['Pending', 'Approved', 'Paid'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={createPayout}
              disabled={actionKey === `payout:${payoutVendorId}`}
              className="rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white disabled:opacity-60"
            >
              Create Payout
            </button>
          </div>

          <div className="mb-5 rounded-xl border border-gray-100 bg-brand-light p-4 text-sm">
            <p className="font-bold text-brand-dark">Eligible Vendor Orders</p>
            <div className="mt-3 max-h-52 space-y-2 overflow-auto">
              {eligibleOrders.map((order) => (
                <div key={order._id} className="flex justify-between gap-3 rounded-lg bg-white p-3">
                  <span>{order.vendor?.businessName || 'Vendor'}</span>
                  <span className="font-semibold">{formatCurrency(order.netTotal, order.currency)}</span>
                </div>
              ))}
              {eligibleOrders.length === 0 && <p className="text-gray-500">No eligible orders.</p>}
            </div>
          </div>

          <div className="space-y-3">
            {payouts.map((payout) => (
              <article key={payout._id} className="rounded-xl border border-gray-100 p-4 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-lg font-bold text-brand-dark">{payout.vendor?.businessName || 'Vendor'}</p>
                    <p className="text-gray-500">
                      {formatCurrency(payout.amount, payout.currency)} - {payout.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Approved', 'Paid', 'Failed', 'Cancelled'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={actionKey === `${payout._id}:${status}`}
                        onClick={() => updatePayout(payout, status)}
                        className="rounded-md border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary disabled:opacity-60"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {payouts.length === 0 && <p className="text-sm text-gray-500">No payouts yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminVendorsPage;
