import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Save, Truck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const SL_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Moneragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const AdminShippingPage = () => {
  const { userInfo } = useAuth();
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  const authHeaders = {
    headers: { Authorization: `Bearer ${userInfo?.token}` },
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRates = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/commerce/shipping-rates', authHeaders);
      const map = {};
      data.forEach((r) => {
        if (r.country === 'Sri Lanka' && r.state) {
          map[r.state] = { fee: r.basePrice, id: r._id };
        }
      });
      setRates(map);
    } catch (err) {
      showToast('Failed to load rates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const seedDistricts = async () => {
    setSeeding(true);
    try {
      await axios.post('/api/admin/commerce/shipping-rates/seed-districts', {}, authHeaders);
      showToast('Districts seeded with default rates!');
      await fetchRates();
    } catch (err) {
      showToast('Seeding failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleFeeChange = (district, value) => {
    setRates((prev) => ({
      ...prev,
      [district]: { ...prev[district], fee: value },
    }));
  };

  const saveRate = async (district) => {
    const fee = parseFloat(rates[district]?.fee ?? 0);
    if (isNaN(fee) || fee < 0) {
      showToast('Invalid fee amount', 'error');
      return;
    }
    setSaving((prev) => ({ ...prev, [district]: true }));
    try {
      await axios.post(
        '/api/admin/commerce/shipping-rates',
        {
          carrier: 'Apex Logistics',
          service: 'District Delivery',
          country: 'Sri Lanka',
          state: district,
          basePrice: fee,
          isActive: true,
        },
        authHeaders
      );
      showToast(`${district} rate saved!`);
    } catch (err) {
      showToast(`Failed to save ${district}`, 'error');
    } finally {
      setSaving((prev) => ({ ...prev, [district]: false }));
    }
  };

  useEffect(() => {
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold shadow-xl transition-all ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 rounded-2xl bg-brand-dark px-6 py-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Admin</p>
        <h1 className="mt-1 flex items-center gap-3 font-serif text-3xl font-bold">
          <Truck size={28} className="text-brand-accent" />
          Shipping Management
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Set per-district delivery fees for Sri Lanka. These fees are fetched live at checkout.
        </p>
      </div>

      {/* Seed + Refresh bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={seedDistricts}
          disabled={seeding}
          className="flex items-center gap-2 rounded-xl border border-brand-accent/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark shadow-sm hover:bg-brand-light transition disabled:opacity-60"
        >
          {seeding ? <RefreshCw size={15} className="animate-spin" /> : <Truck size={15} />}
          {seeding ? 'Seeding…' : 'Seed All 25 Districts (default LKR 500)'}
        </button>
        <button
          onClick={fetchRates}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* District table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <RefreshCw size={24} className="animate-spin mr-3" />
          Loading rates…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-3 border-b border-gray-100 bg-brand-dark/5 px-6 py-3 text-xs font-bold uppercase tracking-wider text-brand-dark">
            <span>District</span>
            <span className="text-center">Shipping Fee (LKR)</span>
            <span className="text-right">Action</span>
          </div>

          {SL_DISTRICTS.map((district, idx) => {
            const currentFee = rates[district]?.fee ?? '';
            const isSaving = saving[district];
            return (
              <div
                key={district}
                className={`grid grid-cols-3 items-center px-6 py-4 transition-colors hover:bg-brand-light/30 ${
                  idx !== SL_DISTRICTS.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="font-semibold text-brand-dark">{district}</span>
                <div className="flex justify-center">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={currentFee}
                    onChange={(e) => handleFeeChange(district, e.target.value)}
                    placeholder="e.g. 500"
                    className="w-36 rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-2 text-sm text-center text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => saveRate(district)}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-brand-dark disabled:opacity-60"
                  >
                    {isSaving ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminShippingPage;
