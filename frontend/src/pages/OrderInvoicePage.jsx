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

const DEFAULT_BUSINESS_INFO = {
  name: 'APEX FASHION',
  email: 'info@apexfashion.lk',
  phone: '+94 76 566 9961',
  address: '[BUSINESS OWNER TO CONFIRM: registered business address in Sri Lanka]',
  website: 'https://apexfashion.lk',
};

const LEGACY_BUSINESS_ADDRESS = '580/12, Moque Lane, Nawala, Rajagiriya, Sri Lanka';

const buildShippingAddressLines = (shippingAddress = {}) =>
  [
    shippingAddress.fullName,
    shippingAddress.email,
    shippingAddress.phone,
    shippingAddress.addressLine1,
    shippingAddress.addressLine2,
    [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', '),
    [shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(' '),
  ].filter(Boolean);

const buildBillingLines = (invoice = {}) =>
  [
    invoice.customer?.name || invoice.shippingAddress?.fullName,
    invoice.customer?.email || invoice.shippingAddress?.email,
    invoice.customer?.phone || invoice.shippingAddress?.phone,
  ].filter(Boolean);

const getBusinessInfo = (business = {}) => ({
  name: business.name && !/^apex spices$/i.test(business.name) ? business.name : DEFAULT_BUSINESS_INFO.name,
  email: business.email && !/apexspices\.lk/i.test(business.email) ? business.email : DEFAULT_BUSINESS_INFO.email,
  phone: business.phone || DEFAULT_BUSINESS_INFO.phone,
  address:
    business.address && business.address !== LEGACY_BUSINESS_ADDRESS
      ? business.address
      : DEFAULT_BUSINESS_INFO.address,
  website:
    business.website && !/apexspices\.lk/i.test(business.website)
      ? business.website
      : DEFAULT_BUSINESS_INFO.website,
});

const formatInvoiceDate = (value, includeTime = false) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString(
    'en-US',
    includeTime
      ? {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }
      : {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
  );
};

const MobileItemRow = ({ label, children, border = false, strong = false }) => (
  <div className={`grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 ${border ? 'border-t border-gray-100 pt-3' : ''}`}>
    <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">{label}</span>
    <span className={`min-w-0 text-right ${strong ? 'font-bold text-brand-primary' : 'font-semibold text-brand-dark'}`}>
      {children}
    </span>
  </div>
);

const PrintAddressBlock = ({ title, lines }) => (
  <div className="invoice-print-box invoice-print-section">
    <h2>{title}</h2>
    <div>
      {lines.length ? (
        lines.map((line) => <p key={`${title}-${line}`}>{line}</p>)
      ) : (
        <p>Not available</p>
      )}
    </div>
  </div>
);

const PrintInvoice = ({ invoice, billingLines, shippingLines, businessInfo }) => (
  <section className="invoice-print-only" aria-hidden="true">
    <div className="invoice-print-page">
      <header className="invoice-print-header invoice-print-section">
        <div className="invoice-print-brand">
          <img className="invoice-print-logo" src="/logo.webp" alt="Apex Fashion" />
          <div>
            <p className="invoice-print-brand-name">APEX FASHION</p>
          </div>
        </div>
        <div className="invoice-print-business">
          <strong>{businessInfo.name}</strong>
          <span>{businessInfo.address}</span>
          <span>{businessInfo.email}</span>
          <span>{businessInfo.phone}</span>
          <span>{businessInfo.website}</span>
        </div>
      </header>

      <section className="invoice-print-title-row invoice-print-section">
        <div>
          <h1>Invoice / Receipt</h1>
          <p>Order #{invoice.orderId}</p>
        </div>
        <div className="invoice-print-meta">
          <span>Issue Date</span>
          <strong>{formatInvoiceDate(invoice.createdAt)}</strong>
        </div>
      </section>

      <section className="invoice-print-address-grid">
        <PrintAddressBlock title="Billing Details" lines={billingLines} />
        <PrintAddressBlock title="Shipping Details" lines={shippingLines} />
      </section>

      <section className="invoice-print-section">
        <table className="invoice-print-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Color</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).length ? (
              invoice.items.map((item, index) => (
                <tr key={`${item.product || item.name}-${index}`}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.variantLabel && <span>{item.variantLabel}</span>}
                  </td>
                  <td>{item.size || '-'}</td>
                  <td>{item.color || '-'}</td>
                  <td>{item.sku || '-'}</td>
                  <td>{item.qty}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No purchased items found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="invoice-print-bottom invoice-print-section">
        <div className="invoice-print-payment">
          <h2>Payment Details</h2>
          <div>
            <span>Method</span>
            <strong>{invoice.payment?.method || 'Not available'}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{getPaymentLabel(invoice.payment?.status)}</strong>
          </div>
          <div>
            <span>Paid Date</span>
            <strong>{invoice.paidAt ? formatInvoiceDate(invoice.paidAt, true) : 'Not paid yet'}</strong>
          </div>
        </div>

        <div className="invoice-print-totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(invoice.totals?.subtotal || 0)}</strong>
          </div>
          <div>
            <span>Shipping Fee</span>
            <strong>{formatCurrency(invoice.totals?.shipping || 0)}</strong>
          </div>
          <div className="invoice-print-grand-total">
            <span>Final Total</span>
            <strong>{formatCurrency(invoice.totals?.total || 0)}</strong>
          </div>
        </div>
      </section>
    </div>
  </section>
);

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

  const shippingLines = useMemo(() => buildShippingAddressLines(invoice?.shippingAddress), [invoice]);
  const billingLines = useMemo(() => buildBillingLines(invoice), [invoice]);
  const businessInfo = useMemo(() => getBusinessInfo(invoice?.business), [invoice]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#fff7ee]">
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
    <div className="invoice-page-root min-h-screen overflow-x-hidden bg-[#fff7ee] pb-10 pt-3 md:pb-16 md:pt-6">
      <style>{`
        .invoice-print-only {
          display: none;
        }

        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          html,
          body {
            width: 210mm;
            min-height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          #root,
          #root > div,
          #root > div > main {
            display: block !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          #root > div > :not(main),
          .invoice-screen,
          .print-hidden {
            display: none !important;
          }

          .invoice-page-root {
            display: block !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .invoice-print-only {
            display: block !important;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto !important;
            background: #ffffff !important;
            color: #2a1711;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            line-height: 1.35;
          }

          .invoice-print-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 9mm 10mm;
            background: #ffffff;
          }

          .invoice-print-section,
          .invoice-print-table tr,
          .invoice-print-table th,
          .invoice-print-table td {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .invoice-print-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12mm;
            padding-bottom: 5mm;
            border-bottom: 1px solid #ead9c8;
          }

          .invoice-print-brand {
            display: flex;
            align-items: center;
            gap: 3mm;
          }

          .invoice-print-logo {
            width: 14mm;
            height: 14mm;
            object-fit: contain;
          }

          .invoice-print-brand-name {
            margin: 0;
            color: #d6932f;
            font-size: 17px;
            font-weight: 800;
            letter-spacing: 1.4px;
          }

          .invoice-print-business {
            display: flex;
            max-width: 80mm;
            flex-direction: column;
            gap: 1mm;
            text-align: right;
            color: #59453a;
            word-break: break-word;
          }

          .invoice-print-business strong {
            color: #2d140e;
            font-size: 11px;
          }

          .invoice-print-title-row {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 10mm;
            padding: 5mm 0;
          }

          .invoice-print-title-row h1 {
            margin: 1mm 0;
            color: #351a11;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 23px;
            line-height: 1.1;
          }

          .invoice-print-title-row p {
            margin: 0;
          }

          .invoice-print-meta {
            min-width: 46mm;
            padding: 3mm 4mm;
            border: 1px solid #ead9c8;
            text-align: right;
          }

          .invoice-print-meta span {
            display: block;
            color: #7d6b60;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 1.2px;
            text-transform: uppercase;
          }

          .invoice-print-meta strong {
            display: block;
            margin-top: 1mm;
            color: #2d140e;
            font-size: 11px;
          }

          .invoice-print-address-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4mm;
            margin-bottom: 5mm;
          }

          .invoice-print-box,
          .invoice-print-payment,
          .invoice-print-totals {
            border: 1px solid #ead9c8;
            background: #fffaf5;
          }

          .invoice-print-box,
          .invoice-print-payment {
            padding: 3.5mm;
          }

          .invoice-print-box h2,
          .invoice-print-payment h2 {
            margin: 0 0 2.5mm;
            color: #bf7f1d;
            font-size: 8.5px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }

          .invoice-print-box p {
            margin: 0 0 1mm;
            color: #3d2b24;
            word-break: break-word;
          }

          .invoice-print-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            border: 1px solid #ead9c8;
          }

          .invoice-print-table th {
            padding: 2.4mm 2mm;
            border: 1px solid #ead9c8;
            background: #fff3e8;
            color: #6c584d;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.9px;
            text-align: left;
            text-transform: uppercase;
          }

          .invoice-print-table td {
            padding: 2.7mm 2mm;
            border: 1px solid #ead9c8;
            color: #2d201a;
            vertical-align: top;
            word-break: break-word;
          }

          .invoice-print-table th:nth-child(1) {
            width: 33%;
          }

          .invoice-print-table th:nth-child(2),
          .invoice-print-table th:nth-child(3) {
            width: 10%;
          }

          .invoice-print-table th:nth-child(4) {
            width: 13%;
          }

          .invoice-print-table th:nth-child(5) {
            width: 7%;
          }

          .invoice-print-table th:nth-child(6),
          .invoice-print-table th:nth-child(7) {
            width: 13.5%;
          }

          .invoice-print-table td:nth-child(5),
          .invoice-print-table th:nth-child(5) {
            text-align: center;
          }

          .invoice-print-table td:nth-child(6),
          .invoice-print-table td:nth-child(7),
          .invoice-print-table th:nth-child(6),
          .invoice-print-table th:nth-child(7) {
            text-align: right;
            white-space: nowrap;
          }

          .invoice-print-table td strong,
          .invoice-print-table td span {
            display: block;
          }

          .invoice-print-table td strong {
            color: #2d140e;
          }

          .invoice-print-table td span {
            margin-top: 1mm;
            color: #7d6b60;
            font-size: 8.5px;
          }

          .invoice-print-bottom {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 66mm;
            align-items: start;
            gap: 6mm;
            margin-top: 5mm;
          }

          .invoice-print-payment div,
          .invoice-print-totals div {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 5mm;
            padding: 1.8mm 0;
            border-bottom: 1px solid #ead9c8;
          }

          .invoice-print-payment div:last-child,
          .invoice-print-totals div:last-child {
            border-bottom: 0;
          }

          .invoice-print-payment span,
          .invoice-print-totals span {
            color: #6c584d;
          }

          .invoice-print-payment strong,
          .invoice-print-totals strong {
            color: #2d140e;
            text-align: right;
          }

          .invoice-print-totals {
            padding: 2.5mm 3.5mm;
            background: #ffffff;
          }

          .invoice-print-grand-total {
            margin-top: 1mm;
            padding-top: 3mm !important;
            border-top: 2px solid #9e3f2f;
          }

          .invoice-print-grand-total span,
          .invoice-print-grand-total strong {
            color: #9e3f2f;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 16px;
            font-weight: 800;
          }
        }
      `}</style>

      <div className="invoice-screen container mx-auto max-w-6xl px-3 sm:px-4">
        <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
          <Link
            to={backLink}
            className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
          >
            &larr; Back to Order
          </Link>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-w-0 flex-1 basis-[7.5rem] items-center justify-center rounded-xl border border-brand-primary/20 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white sm:flex-none sm:px-4 sm:text-xs sm:tracking-[0.18em]"
            >
              <Printer size={14} className="mr-2 shrink-0" /> Print
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-w-0 flex-1 basis-[10rem] items-center justify-center rounded-xl bg-brand-primary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-brand-dark sm:flex-none sm:px-4 sm:text-xs sm:tracking-[0.18em]"
            >
              <Download size={14} className="mr-2 shrink-0" /> Download PDF
            </button>
          </div>
        </div>

        <div className="print-surface max-w-full overflow-hidden rounded-[24px] border border-brand-accent/20 bg-white shadow-[0_20px_60px_rgba(53,26,17,0.1)] md:rounded-[32px]">
          <div className="min-w-0 bg-gradient-to-r from-brand-dark via-brand-primary to-brand-accent px-4 py-7 text-white sm:px-6 md:px-10 md:py-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-accent sm:text-xs sm:tracking-[0.35em]">
              APEX LINK GROUP
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold sm:mt-4 sm:text-4xl">Invoice / Receipt</h1>
            <p className="mt-3 break-words text-xs text-white/80 sm:text-sm">
              Order {invoice.orderId} &bull; {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="grid min-w-0 gap-5 px-4 py-5 md:gap-8 md:px-6 md:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <section className="min-w-0 space-y-5 md:space-y-6">
              <div className="rounded-2xl bg-brand-light p-4 md:rounded-3xl md:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent md:text-xs">Billed To</p>
                <div className="mt-3 space-y-1 break-words text-sm text-brand-dark">
                  {shippingLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-3xl border border-gray-100 md:block">
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-brand-light text-left text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                      <th className="w-[46%] px-4 py-3">Item</th>
                      <th className="w-[12%] px-4 py-3">Qty</th>
                      <th className="w-[20%] px-4 py-3">Price</th>
                      <th className="w-[22%] px-4 py-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-brand-dark">
                    {(invoice.items || []).map((item) => (
                      <tr key={`${item.name}-${item.product}`}>
                        <td className="px-4 py-3 align-top">
                          <div className="break-words font-semibold">{item.name}</div>
                          {(item.variantLabel || item.size || item.color || item.sku) && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                              {item.variantLabel && <span className="break-words">{item.variantLabel}</span>}
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
                              {item.sku && <span className="break-all">SKU: {item.sku}</span>}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top">{item.qty}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-top">{formatCurrency(item.price)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top font-semibold">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {(invoice.items || []).map((item) => (
                  <div key={`${item.name}-${item.product}`} className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Product</p>
                        <p className="mt-1 break-words font-semibold text-brand-dark">{item.name}</p>
                      </div>
                      {item.size && (
                        <MobileItemRow label="Size">
                          <span className="break-words">{item.size}</span>
                        </MobileItemRow>
                      )}
                      {item.color && (
                        <MobileItemRow label="Color">
                          <span className="break-words">{item.color}</span>
                        </MobileItemRow>
                      )}
                      {item.sku && (
                        <MobileItemRow label="SKU">
                          <span className="break-all">{item.sku}</span>
                        </MobileItemRow>
                      )}
                      <MobileItemRow label="Quantity" border>{item.qty}</MobileItemRow>
                      <MobileItemRow label="Price">{formatCurrency(item.price)}</MobileItemRow>
                      <MobileItemRow label="Line Total" strong>{formatCurrency(item.lineTotal)}</MobileItemRow>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 space-y-5 md:space-y-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 md:rounded-3xl md:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent md:text-xs">
                  Payment Summary
                </p>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <span className="min-w-0">Items subtotal</span>
                    <span className="whitespace-nowrap text-right font-semibold text-brand-dark">
                      {formatCurrency(invoice.totals?.subtotal || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <span className="min-w-0">Shipping</span>
                    <span className="whitespace-nowrap text-right font-semibold text-brand-dark">
                      {formatCurrency(invoice.totals?.shipping || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-dashed pt-4 font-serif text-lg font-bold text-brand-dark sm:text-xl">
                    <span className="min-w-0">Total</span>
                    <span className="whitespace-nowrap text-right text-brand-primary">
                      {formatCurrency(invoice.totals?.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 md:rounded-3xl md:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent md:text-xs">Statuses</p>
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
                <div className="mt-4 space-y-2 break-words text-sm text-gray-600">
                  <p>Provider: <span className="font-semibold text-brand-dark">{invoice.payment?.provider || 'Manual'}</span></p>
                  <p>Method: <span className="font-semibold text-brand-dark">{invoice.payment?.method || 'Not available'}</span></p>
                  <p>
                    Paid at:{' '}
                    <span className="font-semibold text-brand-dark">
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('en-US') : 'Not paid yet'}
                    </span>
                  </p>
                  <p>
                    Refunded amount:{' '}
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.refund?.refundedAmount || 0)}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-brand-light p-4 text-sm text-gray-600 md:rounded-3xl md:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent md:text-xs">
                  Business Information
                </p>
                <p className="mt-3 font-semibold text-brand-dark">{businessInfo.name}</p>
                <p className="break-words">{businessInfo.address}</p>
                <p className="break-all">{businessInfo.email}</p>
                <p>{businessInfo.phone}</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <PrintInvoice
        invoice={invoice}
        billingLines={billingLines}
        shippingLines={shippingLines}
        businessInfo={businessInfo}
      />
    </div>
  );
};

export default OrderInvoicePage;
