import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOrderStatusBadgeClass } from '../utils/orderStatus';

const AdminPackingSlipPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [packingSlip, setPackingSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userInfo?.token) {
      navigate(`/login?redirect=/admin/orders/${id}/packing-slip`);
      return;
    }

    if (!userInfo.isAdmin) {
      navigate('/profile');
      return;
    }

    const fetchPackingSlip = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/orders/${id}/packing-slip`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        setPackingSlip(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load packing slip right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchPackingSlip();
  }, [id, navigate, userInfo]);

  const shippingLines = useMemo(() => {
    if (!packingSlip?.shippingAddress) {
      return [];
    }

    const shippingAddress = packingSlip.shippingAddress;

    return [
      shippingAddress.fullName,
      shippingAddress.phone,
      shippingAddress.addressLine1,
      shippingAddress.addressLine2,
      [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', '),
      [shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(' '),
    ].filter(Boolean);
  }, [packingSlip]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f7f9fc]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent" />
        <p className="mt-4 font-serif text-lg text-brand-dark">Preparing packing slip...</p>
      </div>
    );
  }

  if (error || !packingSlip) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">Unable to load packing slip</p>
          <p className="mt-3 text-sm text-red-700">{error || 'Packing slip data is unavailable.'}</p>
          <Link
            to={`/admin/orders/${id}`}
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

      <div className="container mx-auto max-w-5xl px-4">
        <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/admin/orders/${id}`}
            className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
          >
            &larr; Back to Admin Order
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
            <h1 className="mt-4 font-serif text-4xl font-bold">Packing Slip</h1>
            <p className="mt-3 text-sm text-white/80">
              Order {packingSlip.orderId} • {new Date(packingSlip.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl bg-brand-light p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Ship To</p>
                <div className="mt-3 space-y-1 text-sm text-brand-dark">
                  {shippingLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-brand-light p-5 text-sm text-gray-700">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Fulfillment</p>
                <p className="mt-3">
                  Status:{' '}
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getOrderStatusBadgeClass(packingSlip.orderStatus)}`}>
                    {packingSlip.orderStatus}
                  </span>
                </p>
                <p className="mt-3">Tracking Number: <span className="font-semibold text-brand-dark">{packingSlip.trackingNumber || 'Pending assignment'}</span></p>
                <p className="mt-2">Delivery Note: <span className="font-semibold text-brand-dark">{packingSlip.deliveryNote || 'No note added'}</span></p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-100">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-light text-left text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-brand-dark">
                  {(packingSlip.items || []).map((item) => (
                    <tr key={`${item.product}-${item.name}`}>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 font-semibold">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPackingSlipPage;
