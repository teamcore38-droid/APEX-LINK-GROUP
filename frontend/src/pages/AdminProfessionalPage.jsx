import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Database,
  FileText,
  Image,
  Loader2,
  MessageCircle,
  Save,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';

const PERMISSIONS = [
  'catalog:read',
  'catalog:write',
  'catalog:delete',
  'orders:read',
  'orders:write',
  'commerce:manage',
  'vendors:manage',
  'reports:read',
  'cms:manage',
  'media:manage',
  'staff:manage',
  'audit:read',
  'bulk:manage',
  'webhooks:manage',
];

const ROLE_OPTIONS = [
  'custom',
  'catalog_manager',
  'order_manager',
  'commerce_manager',
  'content_manager',
  'analyst',
  'vendor_manager',
];

const INITIAL_STAFF_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'custom',
  staffPermissions: '',
  staffStatus: 'Active',
  isAdmin: false,
};

const INITIAL_MEDIA_FORM = {
  title: '',
  url: '',
  altText: '',
  type: 'image',
  folder: 'products',
  tags: '',
};

const INITIAL_BANNER_FORM = {
  title: '',
  subtitle: '',
  image: '',
  linkLabel: '',
  linkUrl: '',
  placement: 'homepage',
  displayOrder: 0,
  isActive: true,
};

const INITIAL_SECTION_FORM = {
  key: '',
  title: '',
  subtitle: '',
  body: '',
  image: '',
  sectionType: 'custom',
  displayOrder: 0,
  isActive: true,
};

const INITIAL_FAQ_FORM = {
  question: '',
  answer: '',
  category: 'General',
  displayOrder: 0,
  isActive: true,
};

const INITIAL_POLICY_FORM = {
  slug: '',
  title: '',
  summary: '',
  body: '',
  isActive: true,
};

const INITIAL_WEBHOOK_FORM = {
  name: '',
  url: '',
  events: '*',
  secret: '',
  isActive: true,
};

const Section = ({ children, icon: Icon, title }) => (
  <section className="rounded-lg bg-white p-6 shadow-sm">
    <h2 className="mb-5 flex items-center text-xl font-serif font-bold text-brand-dark">
      <Icon className="mr-2 text-brand-accent" size={22} /> {title}
    </h2>
    {children}
  </section>
);

const Field = ({ label, value, onChange, type = 'text', textarea = false }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
    {textarea ? (
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-accent"
      />
    )}
  </label>
);

const AdminProfessionalPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffPayload, setStaffPayload] = useState({ users: [], allPermissions: PERMISSIONS });
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [webhooks, setWebhooks] = useState({ eventCatalog: [], subscriptions: [] });
  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [ticketReplies, setTicketReplies] = useState({});
  const [cms, setCms] = useState({ banners: [], homepageSections: [], faqs: [], policies: [] });
  const [media, setMedia] = useState([]);
  const [staffForm, setStaffForm] = useState(INITIAL_STAFF_FORM);
  const [mediaForm, setMediaForm] = useState(INITIAL_MEDIA_FORM);
  const [bannerForm, setBannerForm] = useState(INITIAL_BANNER_FORM);
  const [sectionForm, setSectionForm] = useState(INITIAL_SECTION_FORM);
  const [faqForm, setFaqForm] = useState(INITIAL_FAQ_FORM);
  const [policyForm, setPolicyForm] = useState(INITIAL_POLICY_FORM);
  const [webhookForm, setWebhookForm] = useState(INITIAL_WEBHOOK_FORM);
  const [productImportText, setProductImportText] = useState('');
  const [productExportText, setProductExportText] = useState('');
  const [bulkOrderIds, setBulkOrderIds] = useState('');
  const [bulkOrderStatus, setBulkOrderStatus] = useState('Confirmed');
  const [savingKey, setSavingKey] = useState('');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${userInfo?.token}`,
        'Content-Type': 'application/json',
      },
    }),
    [userInfo?.token]
  );

  const hasPermission = useCallback(
    (permission) =>
      Boolean(
        userInfo?.isAdmin ||
          userInfo?.permissions?.includes(permission) ||
          userInfo?.permissions?.includes('*')
      ),
    [userInfo]
  );

  const loadProfessionalAdmin = useCallback(async () => {
    if (!userInfo?.token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requests = [];
      if (hasPermission('staff:manage')) {
        requests.push(axios.get('/api/admin/pro/staff', config).then(({ data }) => setStaffPayload(data)));
      }
      if (hasPermission('reports:read')) {
        requests.push(axios.get('/api/admin/pro/reports', config).then(({ data }) => setReports(data)));
      }
      if (hasPermission('audit:read')) {
        requests.push(axios.get('/api/admin/pro/audit', config).then(({ data }) => setAuditLogs(data)));
      }
      if (hasPermission('orders:read')) {
        requests.push(axios.get('/api/customer/admin/support-tickets', config).then(({ data }) => setSupportTickets(data)));
      }
      if (hasPermission('cms:manage')) {
        requests.push(axios.get('/api/admin/pro/cms', config).then(({ data }) => setCms(data)));
      }
      if (hasPermission('media:manage')) {
        requests.push(axios.get('/api/admin/pro/media', config).then(({ data }) => setMedia(data)));
      }
      if (hasPermission('webhooks:manage')) {
        requests.push(axios.get('/api/admin/webhooks', config).then(({ data }) => setWebhooks(data)));
        requests.push(axios.get('/api/admin/webhooks/deliveries', config).then(({ data }) => setWebhookDeliveries(data)));
      }

      await Promise.all(requests);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load professional admin tools.');
    } finally {
      setLoading(false);
    }
  }, [config, hasPermission, userInfo?.token]);

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/admin/professional');
      return;
    }

    if (!userInfo.isAdmin && !userInfo.isStaff) {
      navigate('/profile');
      return;
    }

    const timer = window.setTimeout(() => {
      loadProfessionalAdmin();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProfessionalAdmin, navigate, userInfo]);

  const runAction = async (key, action, message) => {
    setSavingKey(key);
    setError('');
    setSuccess('');
    try {
      await action();
      setSuccess(message);
      await loadProfessionalAdmin();
    } catch (actionError) {
      console.error(actionError);
      setError(actionError.response?.data?.message || 'Admin action failed.');
    } finally {
      setSavingKey('');
    }
  };

  const saveStaff = () =>
    runAction(
      'staff',
      () =>
        axios.post(
          '/api/admin/pro/staff',
          {
            ...staffForm,
            staffPermissions: staffForm.staffPermissions
              .split(',')
              .map((permission) => permission.trim())
              .filter(Boolean),
          },
          config
        ),
      'Staff account saved.'
    );

  const saveMedia = () =>
    runAction('media', () => axios.post('/api/admin/pro/media', mediaForm, config), 'Media asset saved.');

  const saveBanner = () =>
    runAction('banner', () => axios.post('/api/admin/pro/cms/banners', bannerForm, config), 'Banner saved.');

  const saveHomepageSection = () =>
    runAction(
      'homepage-section',
      () => axios.post('/api/admin/pro/cms/homepage-sections', sectionForm, config),
      'Homepage section saved.'
    );

  const saveFaq = () =>
    runAction('faq', () => axios.post('/api/admin/pro/cms/faqs', faqForm, config), 'FAQ saved.');

  const savePolicy = () =>
    runAction('policy', () => axios.post('/api/admin/pro/cms/policies', policyForm, config), 'Policy saved.');

  const saveWebhook = () =>
    runAction(
      'webhook',
      () =>
        axios.post(
          '/api/admin/webhooks',
          {
            ...webhookForm,
            events: webhookForm.events
              .split(',')
              .map((event) => event.trim())
              .filter(Boolean),
          },
          config
        ),
      'Webhook subscription saved.'
    );

  const testWebhook = (subscriptionId) =>
    runAction(
      `webhook-test:${subscriptionId}`,
      () => axios.post(`/api/admin/webhooks/${subscriptionId}/test`, {}, config),
      'Webhook test sent.'
    );

  const importProducts = () =>
    runAction(
      'product-import',
      () => axios.post('/api/admin/pro/bulk/products/import', { csv: productImportText }, config),
      'Product import processed.'
    );

  const exportProducts = () =>
    runAction(
      'product-export',
      async () => {
        const { data } = await axios.get('/api/admin/pro/bulk/products/export?format=csv', {
          ...config,
          responseType: 'text',
        });
        setProductExportText(data);
      },
      'Product export generated.'
    );

  const updateBulkOrders = () =>
    runAction(
      'bulk-orders',
      () =>
        axios.put(
          '/api/admin/pro/bulk/orders',
          {
            orderIds: bulkOrderIds
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean),
            updates: { orderStatus: bulkOrderStatus },
          },
          config
        ),
      'Bulk order action applied.'
    );

  const updateSupportTicket = (ticket, status = ticket.status) =>
    runAction(
      `ticket:${ticket._id}`,
      () =>
        axios.put(
          `/api/customer/admin/support-tickets/${ticket._id}`,
          {
            status,
            reply: ticketReplies[ticket._id] || '',
            assignedToName: userInfo?.name || userInfo?.email || '',
          },
          config
        ),
      'Support ticket updated.'
    );

  const canAccessAnySection = [
    'staff:manage',
    'reports:read',
    'audit:read',
    'bulk:manage',
    'cms:manage',
    'media:manage',
    'webhooks:manage',
  ].some((permission) => hasPermission(permission));

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

        <div className="mt-6 rounded-lg bg-brand-dark px-6 py-10 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-accent">Professional Admin</p>
          <h1 className="mt-3 font-serif text-4xl font-bold">Roles, Bulk Ops, Reports, CMS, Media</h1>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {!canAccessAnySection && (
          <div className="mt-8 rounded-lg bg-white p-8 text-sm text-gray-500 shadow-sm">
            Your staff account has no professional admin permissions assigned yet.
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          {hasPermission('staff:manage') && (
            <Section icon={Users} title="Staff Accounts & Permissions">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name" value={staffForm.name} onChange={(value) => setStaffForm((form) => ({ ...form, name: value }))} />
                <Field label="Email" value={staffForm.email} onChange={(value) => setStaffForm((form) => ({ ...form, email: value }))} />
                <Field label="Phone" value={staffForm.phone} onChange={(value) => setStaffForm((form) => ({ ...form, phone: value }))} />
                <Field label="Password" value={staffForm.password} onChange={(value) => setStaffForm((form) => ({ ...form, password: value }))} type="password" />
                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Role</span>
                  <select value={staffForm.role} onChange={(event) => setStaffForm((form) => ({ ...form, role: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm">
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <Field label="Permissions CSV" value={staffForm.staffPermissions} onChange={(value) => setStaffForm((form) => ({ ...form, staffPermissions: value }))} />
              </div>
              <div className="mt-3 rounded-xl bg-brand-light p-3 text-xs text-gray-600">
                Available: {staffPayload.allPermissions?.join(', ')}
              </div>
              <button type="button" onClick={saveStaff} className="mt-4 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                {savingKey === 'staff' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} Save Staff
              </button>
              <div className="mt-5 max-h-64 space-y-2 overflow-auto">
                {staffPayload.users.map((staff) => (
                  <div key={staff._id} className="rounded-xl border border-gray-100 p-3 text-sm">
                    <p className="font-semibold text-brand-dark">{staff.name} - {staff.role}</p>
                    <p className="text-gray-500">{staff.email} - {staff.staffStatus}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasPermission('reports:read') && reports && (
            <Section icon={BarChart3} title="Advanced Reporting">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Sales</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-brand-dark">{formatCurrency(reports.sales.revenue)}</p>
                </div>
                <div className="rounded-xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Refunds</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-brand-dark">{formatCurrency(reports.sales.refunds)}</p>
                </div>
                <div className="rounded-xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Customers</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-brand-dark">{reports.customers.totalCustomers}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-gray-100 p-4 text-sm">
                <p className="font-semibold text-brand-dark">Inventory Value: {formatCurrency(reports.inventory.inventoryValue || 0)}</p>
                <p className="mt-1 text-gray-500">Stock units {reports.inventory.stockUnits || 0}, reserved {reports.inventory.reservedUnits || 0}</p>
              </div>
              <div className="mt-5 max-h-64 space-y-2 overflow-auto">
                {reports.sales.topProducts.map((product) => (
                  <div key={product._id || product.name} className="flex justify-between rounded-xl bg-brand-light p-3 text-sm">
                    <span>{product.name}</span>
                    <span className="font-semibold">{formatCurrency(product.revenue)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasPermission('bulk:manage') && (
            <Section icon={Database} title="Bulk Import, Export, Order Actions">
              <Field
                label="Product CSV Import"
                value={productImportText}
                onChange={setProductImportText}
                textarea
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={importProducts} className="inline-flex items-center rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">
                  <Upload size={15} className="mr-2" /> Import Products
                </button>
                <button type="button" onClick={exportProducts} className="inline-flex items-center rounded-md border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                  Export Products
                </button>
              </div>
              {productExportText && (
                <textarea readOnly rows={5} value={productExportText} className="mt-3 w-full rounded-xl border border-gray-200 p-3 font-mono text-xs" />
              )}
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input value={bulkOrderIds} onChange={(event) => setBulkOrderIds(event.target.value)} placeholder="Order IDs, comma separated" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
                <select value={bulkOrderStatus} onChange={(event) => setBulkOrderStatus(event.target.value)} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
                  {['Processing', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <button type="button" onClick={updateBulkOrders} className="rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">Apply</button>
              </div>
            </Section>
          )}

          {hasPermission('cms:manage') && (
            <Section icon={FileText} title="CMS: Banners, Homepage, FAQs, Policies">
              <div className="grid gap-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Banner Title" value={bannerForm.title} onChange={(value) => setBannerForm((form) => ({ ...form, title: value }))} />
                  <Field label="Banner Image" value={bannerForm.image} onChange={(value) => setBannerForm((form) => ({ ...form, image: value }))} />
                  <Field label="Banner Subtitle" value={bannerForm.subtitle} onChange={(value) => setBannerForm((form) => ({ ...form, subtitle: value }))} />
                  <Field label="Link URL" value={bannerForm.linkUrl} onChange={(value) => setBannerForm((form) => ({ ...form, linkUrl: value }))} />
                </div>
                <button type="button" onClick={saveBanner} className="self-start rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">Save Banner</button>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Section Key" value={sectionForm.key} onChange={(value) => setSectionForm((form) => ({ ...form, key: value }))} />
                  <Field label="Section Title" value={sectionForm.title} onChange={(value) => setSectionForm((form) => ({ ...form, title: value }))} />
                  <Field label="Section Body" value={sectionForm.body} onChange={(value) => setSectionForm((form) => ({ ...form, body: value }))} textarea />
                  <Field label="Section Image" value={sectionForm.image} onChange={(value) => setSectionForm((form) => ({ ...form, image: value }))} />
                </div>
                <button type="button" onClick={saveHomepageSection} className="self-start rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">Save Section</button>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="FAQ Question" value={faqForm.question} onChange={(value) => setFaqForm((form) => ({ ...form, question: value }))} />
                  <Field label="FAQ Category" value={faqForm.category} onChange={(value) => setFaqForm((form) => ({ ...form, category: value }))} />
                  <Field label="FAQ Answer" value={faqForm.answer} onChange={(value) => setFaqForm((form) => ({ ...form, answer: value }))} textarea />
                </div>
                <button type="button" onClick={saveFaq} className="self-start rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">Save FAQ</button>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Policy Slug" value={policyForm.slug} onChange={(value) => setPolicyForm((form) => ({ ...form, slug: value }))} />
                  <Field label="Policy Title" value={policyForm.title} onChange={(value) => setPolicyForm((form) => ({ ...form, title: value }))} />
                  <Field label="Policy Body" value={policyForm.body} onChange={(value) => setPolicyForm((form) => ({ ...form, body: value }))} textarea />
                </div>
                <button type="button" onClick={savePolicy} className="self-start rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">Save Policy</button>
              </div>
              <p className="mt-5 text-sm text-gray-500">
                {cms.banners.length} banners, {cms.homepageSections.length} homepage sections, {cms.faqs.length} FAQs, {cms.policies.length} policies.
              </p>
            </Section>
          )}

          {hasPermission('media:manage') && (
            <Section icon={Image} title="Media Library">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Title" value={mediaForm.title} onChange={(value) => setMediaForm((form) => ({ ...form, title: value }))} />
                <Field label="URL" value={mediaForm.url} onChange={(value) => setMediaForm((form) => ({ ...form, url: value }))} />
                <Field label="Alt Text" value={mediaForm.altText} onChange={(value) => setMediaForm((form) => ({ ...form, altText: value }))} />
                <Field label="Folder" value={mediaForm.folder} onChange={(value) => setMediaForm((form) => ({ ...form, folder: value }))} />
                <Field label="Tags CSV" value={mediaForm.tags} onChange={(value) => setMediaForm((form) => ({ ...form, tags: value }))} />
              </div>
              <button type="button" onClick={saveMedia} className="mt-4 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                <Save size={16} className="mr-2" /> Save Asset
              </button>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {media.slice(0, 8).map((asset) => (
                  <div key={asset._id} className="rounded-xl border border-gray-100 p-3 text-sm">
                    {asset.type === 'image' && <img src={asset.url} alt={asset.altText || asset.title} className="mb-3 h-28 w-full rounded-lg object-cover" />}
                    <p className="font-semibold text-brand-dark">{asset.title}</p>
                    <p className="text-xs text-gray-500">{asset.folder}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasPermission('audit:read') && (
            <Section icon={ShieldCheck} title="Admin Audit Logs">
              <div className="max-h-[520px] space-y-3 overflow-auto">
                {auditLogs.map((log) => (
                  <div key={log._id} className="rounded-xl border border-gray-100 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <p className="font-semibold text-brand-dark">{log.action}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-gray-500">{log.actorName || log.actor?.email || 'System'} - {log.resourceType} {log.resourceId}</p>
                  </div>
                ))}
                {auditLogs.length === 0 && <p className="text-sm text-gray-500">No audit logs yet.</p>}
              </div>
            </Section>
          )}

          {hasPermission('webhooks:manage') && (
            <Section icon={ShieldCheck} title="Partner Webhooks">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Webhook Name" value={webhookForm.name} onChange={(value) => setWebhookForm((form) => ({ ...form, name: value }))} />
                <Field label="Endpoint URL" value={webhookForm.url} onChange={(value) => setWebhookForm((form) => ({ ...form, url: value }))} />
                <Field label="Events CSV" value={webhookForm.events} onChange={(value) => setWebhookForm((form) => ({ ...form, events: value }))} />
                <Field label="Signing Secret" value={webhookForm.secret} onChange={(value) => setWebhookForm((form) => ({ ...form, secret: value }))} />
              </div>
              <div className="mt-3 rounded-xl bg-brand-light p-3 text-xs text-gray-600">
                Events: {webhooks.eventCatalog?.join(', ')}
              </div>
              <button
                type="button"
                onClick={saveWebhook}
                className="mt-4 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white"
              >
                {savingKey === 'webhook' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} Save Webhook
              </button>
              <div className="mt-5 space-y-3">
                {webhooks.subscriptions.map((subscription) => (
                  <div key={subscription._id} className="rounded-xl border border-gray-100 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-brand-dark">{subscription.name}</p>
                        <p className="break-all text-xs text-gray-500">{subscription.url}</p>
                        <p className="mt-1 text-xs text-gray-500">{subscription.events?.join(', ')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => testWebhook(subscription._id)}
                        className="rounded-md border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                ))}
                {webhooks.subscriptions.length === 0 && <p className="text-sm text-gray-500">No webhook subscriptions yet.</p>}
              </div>
              <div className="mt-5 max-h-56 space-y-2 overflow-auto">
                {webhookDeliveries.slice(0, 8).map((delivery) => (
                  <div key={delivery._id} className="rounded-xl bg-brand-light p-3 text-sm">
                    <p className="font-semibold text-brand-dark">{delivery.event} - {delivery.status}</p>
                    <p className="text-xs text-gray-500">{delivery.subscription?.name || 'Webhook'} · HTTP {delivery.httpStatus || 'n/a'}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasPermission('orders:read') && (
            <Section icon={MessageCircle} title="Support Tickets & Live Chat">
              <div className="max-h-[520px] space-y-3 overflow-auto">
                {supportTickets.map((ticket) => (
                  <div key={ticket._id} className="rounded-xl border border-gray-100 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <div>
                        <p className="font-semibold text-brand-dark">{ticket.subject}</p>
                        <p className="text-gray-500">{ticket.guestEmail || ticket.user?.email} - {ticket.status}</p>
                      </div>
                      <select
                        value={ticket.status}
                        onChange={(event) => updateSupportTicket(ticket, event.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
                      >
                        {['Open', 'Pending Customer', 'Pending Staff', 'Resolved', 'Closed'].map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 rounded-lg bg-brand-light p-3 text-gray-600">
                      {ticket.messages?.slice(-1)[0]?.body || 'No messages'}
                    </div>
                    {hasPermission('orders:write') && (
                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                        <input
                          value={ticketReplies[ticket._id] || ''}
                          onChange={(event) => setTicketReplies((current) => ({ ...current, [ticket._id]: event.target.value }))}
                          placeholder="Reply to customer"
                          className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateSupportTicket(ticket, 'Pending Customer')}
                          className="rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {supportTickets.length === 0 && <p className="text-sm text-gray-500">No support tickets yet.</p>}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfessionalPage;
