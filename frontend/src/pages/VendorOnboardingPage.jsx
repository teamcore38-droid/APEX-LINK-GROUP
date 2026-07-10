import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INITIAL_FORM = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  businessType: '',
  taxId: '',
  registrationNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  payoutMethod: '',
  payoutEmail: '',
  bankName: '',
  accountLast4: '',
};

const INPUTS = [
  ['businessName', 'Business Name'],
  ['contactName', 'Contact Name'],
  ['email', 'Business Email'],
  ['phone', 'Phone'],
  ['website', 'Website'],
  ['businessType', 'Business Type'],
  ['taxId', 'Tax ID'],
  ['registrationNumber', 'Registration Number'],
  ['addressLine1', 'Address Line 1'],
  ['addressLine2', 'Address Line 2'],
  ['city', 'City'],
  ['state', 'State'],
  ['postalCode', 'Postal Code'],
  ['country', 'Country'],
  ['payoutMethod', 'Payout Method'],
  ['payoutEmail', 'Payout Email'],
  ['bankName', 'Bank Name'],
  ['accountLast4', 'Account Last 4'],
];

const VendorOnboardingPage = () => {
  const { userInfo, syncUserInfo } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [documentLabel, setDocumentLabel] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documents, setDocuments] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login');
      return;
    }

    const loadVendor = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/vendors/me', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });

        if (data) {
          setVendor(data);
          setForm({ ...INITIAL_FORM, ...data });
          setDocuments(Array.isArray(data.documents) ? data.documents : []);
        } else {
          setForm({
            ...INITIAL_FORM,
            contactName: userInfo.name || '',
            email: userInfo.email || '',
            phone: userInfo.phone || '',
          });
        }
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.response?.data?.message || 'Unable to load vendor profile.');
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [navigate, userInfo]);

  const updateForm = (key, value) => {
    setMessage('');
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addDocument = () => {
    if (!documentLabel.trim() && !documentUrl.trim()) {
      return;
    }

    setDocuments((current) => [
      ...current,
      { label: documentLabel.trim(), url: documentUrl.trim(), status: 'Pending' },
    ]);
    setDocumentLabel('');
    setDocumentUrl('');
  };

  const saveProfile = async (submit = false) => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };
      const { data } = await axios.put('/api/vendors/me', { ...form, documents }, config);
      const nextVendor = submit
        ? (await axios.put('/api/vendors/me/submit', {}, config)).data
        : data;

      setVendor(nextVendor);
      if (syncUserInfo && userInfo) {
        syncUserInfo({
          ...userInfo,
          isVendor: ['Verified', 'Submitted', 'Under Review'].includes(nextVendor.status),
          vendorStatus: nextVendor.status,
        });
      }
      setMessage(submit ? 'Vendor profile submitted for verification.' : 'Vendor profile saved.');
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || 'Unable to save vendor profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-brand-primary">
        <Loader2 className="mx-auto mb-3 animate-spin" /> Loading vendor profile
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Supplier Portal</p>
          <h1 className="mt-2 flex items-center text-3xl font-serif font-bold text-brand-dark">
            <Building2 className="mr-3 text-brand-accent" /> Vendor Onboarding
          </h1>
        </div>
        {vendor?.status && (
          <span className="self-start rounded-full border border-brand-accent/30 bg-brand-light px-4 py-2 text-sm font-bold text-brand-primary">
            {vendor.status}
          </span>
        )}
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
      {message && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">{message}</div>}

      <div className="grid gap-4 rounded-lg bg-white p-6 shadow-sm md:grid-cols-2">
        {INPUTS.map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
            <input
              value={form[key] || ''}
              onChange={(event) => updateForm(key, event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
            />
          </label>
        ))}

        <div className="md:col-span-2">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Verification Documents</span>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={documentLabel}
              onChange={(event) => setDocumentLabel(event.target.value)}
              placeholder="Document label"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
            />
            <input
              value={documentUrl}
              onChange={(event) => setDocumentUrl(event.target.value)}
              placeholder="Document URL"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
            />
            <button type="button" onClick={addDocument} className="rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
              Add
            </button>
          </div>
          {documents.length > 0 && (
            <div className="mt-3 grid gap-2">
              {documents.map((document, index) => (
                <div key={`${document.url}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-brand-light px-4 py-3 text-sm">
                  <span className="font-semibold text-brand-dark">{document.label || document.url}</span>
                  <button
                    type="button"
                    onClick={() => setDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="text-xs font-bold uppercase tracking-[0.18em] text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveProfile(false)}
            className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Save Profile
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveProfile(true)}
            className="inline-flex items-center rounded-md border border-brand-primary/30 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary disabled:opacity-60"
          >
            <Send size={16} className="mr-2" /> Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorOnboardingPage;
