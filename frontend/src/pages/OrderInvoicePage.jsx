import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import {
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
  getRefundBadgeClass,
} from '../utils/orderStatus';

const OrderInvoicePage = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdminInvoice = pathname.startsWith('/admin/');
  const backLink = isAdminInvoice ? `/admin/orders/${id}` : `/orders/${id}`;

  useEffect(() => {
    if (!userInfo?.token) {
      navigate(`/login?redirect=${pathname}`);
      return;
    }

    const fetchInvoice = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/orders/${id}/invoice`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        setInvoice(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load invoice right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, navigate, pathname, userInfo]);

  const customerLines = useMemo(() => {
    if (!invoice?.shippingAddress) {
      return [];
    }

    return [
      invoice.shippingAddress.fullName,
      invoice.shippingAddress.email,
      invoice.shippingAddress.phone,
      invoice.shippingAddress.addressLine1,
      invoice.shippingAddress.addressLine2,
      [invoice.shippingAddress.city, invoice.shippingAddress.state].filter(Boolean).join(', '),
      [invoice.shippingAddress.postalCode, invoice.shippingAddress.country].filter(Boolean).join(' '),
    ].filter(Boolean);
  }, [invoice]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f7f9fc]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent" />
        <p className="mt-4 font-serif text-lg text-brand-dark">Preparing invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">Unable to load invoice</p>
          <p className="mt-3 text-sm text-red-700">{error || 'Invoice data is unavailable.'}</p>
          <Link
            to={backLink}
            className="mt-6 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            Back to Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-12">
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          .print-surface { box-shadow: none !important; border: none !important; }
          body { background: #ffffff !important; }
        }
      `}</style>

      <div className="container mx-auto max-w-6xl px-4">
        <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backLink}
            className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
          >
            &larr; Back to Order
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-xl border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              <Printer size={14} className="mr-2" /> Print
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              <Download size={14} className="mr-2" /> Download PDF
            </button>
          </div>
        </div>

        <div className="print-surface overflow-hidden rounded-[32px] border border-brand-accent/20 bg-white shadow-[0_20px_60px_rgba(11,31,58,0.1)]">
          <div className="bg-gradient-to-r from-brand-dark via-brand-primary to-brand-accent px-6 py-10 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">APEX LINK GROUP</p>
            <h1 className="mt-4 font-serif text-4xl font-bold">Invoice / Receipt</h1>
            <p className="mt-3 text-sm text-white/80">
              Order {invoice.orderId} • {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <section className="space-y-6">
              <div className="rounded-3xl bg-brand-light p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Billed To</p>
                <div className="mt-3 space-y-1 text-sm text-brand-dark">
                  {customerLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-gray-100">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-brand-light text-left text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-brand-dark">
                    {(invoice.items || []).map((item) => (
                      <tr key={`${item.name}-${item.product}`}>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Payment Summary</p>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Items subtotal</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.totals?.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.totals?.shipping || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.totals?.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed pt-4 font-serif text-xl font-bold text-brand-dark">
                    <span>Total</span>
                    <span className="text-brand-primary">{formatCurrency(invoice.totals?.total || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Statuses</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusBadgeClass(invoice.orderStatus)}`}>
                    {invoice.orderStatus}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getPaymentBadgeClass(invoice.payment?.status)}`}>
                    {getPaymentLabel(invoice.payment?.status)}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getRefundBadgeClass(invoice.refund?.status)}`}>
                    {invoice.refund?.status || 'Not Refunded'}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>Provider: <span className="font-semibold text-brand-dark">{invoice.payment?.provider || 'Manual'}</span></p>
                  <p>Method: <span className="font-semibold text-brand-dark">{invoice.payment?.method || 'Not available'}</span></p>
                  <p>Paid at: <span className="font-semibold text-brand-dark">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('en-US') : 'Not paid yet'}</span></p>
                  <p>Refunded amount: <span className="font-semibold text-brand-dark">{formatCurrency(invoice.refund?.refundedAmount || 0)}</span></p>
                </div>
              </div>

              <div className="rounded-3xl bg-brand-light p-5 text-sm text-gray-600">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Business Information</p>
                <p className="mt-3 font-semibold text-brand-dark">{invoice.business?.name || 'APEX LINK GROUP'}</p>
                <p>{invoice.business?.address}</p>
                <p>{invoice.business?.email}</p>
                <p>{invoice.business?.phone}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderInvoicePage;
