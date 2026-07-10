import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Loader2,
  Package,
  RefreshCcw,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';

const countFor = (items = [], key) => items.find((item) => item._id === key)?.count || 0;

const getPolicyTarget = (slug = '') => {
  if (slug === 'privacy') return '/privacy';
  if (slug === 'terms') return '/terms';
  if (slug === 'returns') return '/returns';
  if (slug === 'shipping') return '/shipping';
  return '/admin/professional#cms';
};

const MiniStat = ({ label, value, tone = 'bg-white' }) => (
  <div className={`rounded-lg border border-gray-100 p-4 shadow-sm ${tone}`}>
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</p>
    <p className="mt-2 font-serif text-3xl font-bold text-brand-dark">{value}</p>
  </div>
);

const AdminMobilePage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${userInfo?.token}`,
      },
    }),
    [userInfo?.token]
  );

  const canAccess = Boolean(
    userInfo?.isAdmin || userInfo?.permissions?.includes('reports:read') || userInfo?.permissions?.includes('*')
  );

  const loadSummary = useCallback(async () => {
    if (!userInfo?.token) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/v1/mobile/admin/summary', config);
      setSummary(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load mobile admin summary.');
    } finally {
      setLoading(false);
    }
  }, [config, userInfo?.token]);

  useEffect(() => {
    if (!userInfo?.token || !canAccess) {
      navigate('/login?redirect=/admin/mobile');
      return;
    }

    const timer = window.setTimeout(() => {
      loadSummary();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canAccess, loadSummary, navigate, userInfo?.token]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3f8] py-5 sm:py-8">
      <div className="mx-auto max-w-3xl px-3 sm:px-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-dark"
          >
            <ArrowLeft size={15} className="mr-2" /> Admin
          </Link>
          <button
            type="button"
            onClick={loadSummary}
            className="inline-flex items-center rounded-md bg-brand-dark px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white"
          >
            <RefreshCcw size={15} className="mr-2" /> Refresh
          </button>
        </div>

        <section className="rounded-lg bg-brand-dark p-5 text-white shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-accent">Mobile Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Operations Snapshot</h1>
          <p className="mt-2 text-sm text-white/70">Orders, stock, support, policies, and notification health.</p>
        </section>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat label="Processing" value={countFor(summary?.orderCounts, 'Processing')} />
          <MiniStat label="Shipped" value={countFor(summary?.orderCounts, 'Shipped')} />
          <MiniStat label="Pending Cancels" value={summary?.pendingCancellations || 0} tone="bg-amber-50" />
          <MiniStat label="Open Support" value={countFor(summary?.supportCounts, 'Open') + countFor(summary?.supportCounts, 'Pending Staff')} tone="bg-blue-50" />
        </div>

        <section className="mt-5 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center font-serif text-xl font-bold text-brand-dark">
            <Package size={20} className="mr-2 text-brand-accent" /> Recent Orders
          </h2>
          <div className="space-y-3">
            {(summary?.recentOrders || []).map((order) => (
              <Link
                key={order._id}
                to={`/admin/orders/${order._id}`}
                className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-brand-light"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-brand-dark">#{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-sm font-semibold text-brand-primary">{formatCurrency(order.totalPrice, order.currency)}</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {order.user?.name || order.shippingAddress?.fullName || 'Guest'} · {order.orderStatus}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center font-serif text-xl font-bold text-brand-dark">
            <AlertTriangle size={20} className="mr-2 text-brand-accent" /> Low Stock
          </h2>
          <div className="space-y-3">
            {(summary?.lowStockProducts || []).map((product) => (
              <Link
                key={product._id}
                to={`/admin/product/${product._id}/edit`}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="font-semibold text-brand-dark">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku || 'No SKU'}</p>
                </div>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                  {Math.max(Number(product.countInStock || 0) - Number(product.reservedStock || 0), 0)} left
                </span>
              </Link>
            ))}
            {(summary?.lowStockProducts || []).length === 0 && (
              <p className="text-sm text-gray-500">No low-stock products right now.</p>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <section className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center font-serif text-xl font-bold text-brand-dark">
              <Bell size={20} className="mr-2 text-brand-accent" /> Push Logs
            </h2>
            <div className="space-y-2">
              {(summary?.recentPushLogs || []).slice(0, 5).map((log) => (
                <div key={log._id} className="rounded-lg bg-brand-light p-3">
                  <p className="text-sm font-semibold text-brand-dark">{log.title || log.event}</p>
                  <p className="text-xs text-gray-500">{log.status}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center font-serif text-xl font-bold text-brand-dark">
              <Ticket size={20} className="mr-2 text-brand-accent" /> Quick Links
            </h2>
            <div className="grid gap-2">
              <Link to="/admin/professional" className="rounded-md border border-gray-200 px-3 py-3 text-sm font-semibold text-brand-dark">
                Professional Admin
              </Link>
              <Link to="/admin/vendors" className="rounded-md border border-gray-200 px-3 py-3 text-sm font-semibold text-brand-dark">
                Marketplace Ops
              </Link>
              <Link to="/admin/commerce" className="rounded-md border border-gray-200 px-3 py-3 text-sm font-semibold text-brand-dark">
                Commerce Ops
              </Link>
              <Link to="/admin/professional#cms" className="rounded-md border border-gray-200 px-3 py-3 text-sm font-semibold text-brand-dark">
                CMS & Policies
              </Link>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center font-serif text-xl font-bold text-brand-dark">
            <ShieldCheck size={20} className="mr-2 text-brand-accent" /> Public Policies
          </h2>
          <div className="flex flex-wrap gap-2">
            {(summary?.policies || []).map((policy) => (
              <Link
                key={policy._id}
                to={getPolicyTarget(policy.slug)}
                className="rounded-md bg-brand-light px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-dark"
              >
                {policy.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminMobilePage;
