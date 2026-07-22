import { Database, Lock, ShieldCheck, UserRound } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const PrivacyPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Privacy Policy"
      title="How Apex Fashion handles your personal information"
      intro={`${policyUpdateNote} This policy explains how ${BUSINESS_INFO.brandName} collects, uses, shares, protects, and retains personal information when you browse, create an account, place an order, use PayHere checkout, or contact customer care.`}
      highlights={[
        {
          icon: UserRound,
          title: 'Clear Collection',
          body: 'We collect customer, order, delivery, support, payment confirmation, device, and account information needed to operate a fashion e-commerce store.',
        },
        {
          icon: Database,
          title: 'Defined Purposes',
          body: 'Information is used for checkout, delivery, fraud prevention, customer support, legal records, privacy requests, marketing only where permitted, and service improvement.',
        },
        {
          icon: Lock,
          title: 'Payment Safety',
          body: 'Card credentials are entered on PayHere checkout. Apex Fashion does not intentionally store full card numbers, CVV values, or PayHere merchant secrets in the browser.',
        },
        {
          icon: ShieldCheck,
          title: 'Customer Rights',
          body: 'Customers can request access, correction, deletion/anonymisation, consent withdrawal, and other privacy assistance through the Privacy Center or customer care.',
        },
      ]}
      sections={[
        {
          title: 'Who controls this information',
          body: `${BUSINESS_INFO.brandName} is the trading name used on this website. Legal entity: ${BUSINESS_INFO.legalName}. Business registration number: ${BUSINESS_INFO.registrationNumber}. Registered address: ${BUSINESS_INFO.registeredAddress}. Privacy contact: ${BUSINESS_INFO.email}.`,
        },
        {
          title: 'Information we collect',
          body: 'Depending on how you use the website, we may collect information directly from you, automatically through the website, and from service providers that help complete a transaction.',
          points: [
            'Account and identity details: name, email address, phone number, password credentials in protected form, saved addresses, wishlist, reviews, and account preferences.',
            'Order and delivery details: products ordered, sizes, colors, SKU or variant details, quantity, price, shipping address, delivery notes, courier updates, invoices, return requests, and customer support messages.',
            'Payment confirmation details: PayHere payment ID, method, status code, masked card or wallet details if provided by PayHere, amount, currency, and payment notification metadata.',
            'Technical details: IP address, device/browser information, necessary session identifiers, error information, and security logs.',
          ],
        },
        {
          title: 'How we use information',
          body: 'We use personal information for specified, legitimate, and proportionate purposes connected to running the store and serving customers.',
          points: [
            'To create accounts, authenticate users, process orders, issue invoices, arrange delivery, provide tracking, handle returns, and respond to support requests.',
            'To confirm PayHere payments, detect failed or cancelled payments, prevent duplicate payment processing, investigate fraud, and maintain transaction records.',
            'To send transactional emails such as password reset, email verification, order placed, order confirmed, delivery, cancellation, and refund notices.',
            'To send newsletters or promotional messages only where permitted by your preferences, and to allow opt-out from commercial communications.',
            'To maintain legal, tax, accounting, consumer-protection, security, audit, and dispute-resolution records.',
          ],
        },
        {
          title: 'PayHere and payment data',
          body: 'When you choose PayHere, you are redirected to PayHere to enter payment credentials. PayHere sends Apex Fashion a server-side payment notification so we can verify payment status before marking an order as paid. Apex Fashion stores the confirmation data needed to connect that payment to the order and support refunds, chargebacks, disputes, and accounting records.',
        },
        {
          title: 'Cookies and consent choices',
          body: 'Necessary cookies and local storage keep checkout, account security, and cart state working. The storefront currently keeps optional analytics, advertising pixels, and tracking-based personalisation disabled. See the Cookie Policy for more detail.',
          points: [
            'The website does not display an automatic cookie-preference banner or treat continued browsing as consent to optional tracking.',
            'You may clear browser cookies/local storage or contact us for help identifying stored website data.',
          ],
        },
        {
          title: 'When information is shared',
          body: 'We share information only where needed to operate the store, comply with law, protect customers, or complete a transaction.',
          points: [
            'Payment processing: PayHere receives payment and customer checkout details needed to process the selected payment method.',
            'Delivery and logistics: couriers receive contact and address details needed to deliver an order.',
            'Technology providers: hosting, database, email, analytics, security, and support tools may process information on our behalf.',
            'Legal and regulatory purposes: information may be shared with regulators, courts, professional advisers, banks, PayHere, or law-enforcement authorities where required or appropriate.',
          ],
        },
        {
          title: 'International processing',
          body: 'Some technology, payment, hosting, email, and analytics providers may process information outside Sri Lanka. Where applicable, cross-border processing safeguards must be finalised with the relevant providers before publication.',
        },
        {
          title: 'Retention',
          body: 'We keep personal information only as long as needed for the purposes described in this policy, including order fulfilment, returns, fraud prevention, customer support, accounting, tax, legal claims, and statutory record keeping. Retention periods must be finalised by the business owner and legal/accounting advisers.',
          points: [
            'Order and invoice records: [BUSINESS OWNER TO CONFIRM: accounting/tax retention period].',
            'Support messages and contact form records: [BUSINESS OWNER TO CONFIRM: support-retention period].',
            'Marketing consent and unsubscribe records: retained as needed to respect preferences and evidence consent or opt-out.',
          ],
        },
        {
          title: 'Your privacy rights',
          body: 'Subject to applicable Sri Lankan law, including the Personal Data Protection Act, customers may request access to personal data, correction or completion of inaccurate data, withdrawal of consent where processing is based on consent, deletion/anonymisation where applicable, and review of certain privacy decisions.',
          points: [
            'Logged-in customers can use the Privacy Center to request an export or deletion/anonymisation workflow.',
            `You can also contact customer care at ${BUSINESS_INFO.email} with enough information for us to verify the relevant account or order safely.`,
            'Some order, payment, tax, fraud-prevention, or dispute records may need to be retained where required by law or legitimate business obligations.',
          ],
        },
        {
          title: 'Security safeguards',
          body: 'We use practical technical and organisational safeguards, including authenticated account flows, access controls, password hashing, payment verification, audit/security logs, and least-necessary sharing with service providers. No website or payment system can be guaranteed completely secure, so customers should also protect their account passwords and devices.',
        },
      ]}
      relatedLinks={[
        { to: '/terms', label: 'Terms & Conditions' },
        { to: '/cookies', label: 'Cookie Policy' },
        { to: '/payment-policy', label: 'Payment Policy' },
        { to: '/privacy-center', label: 'Privacy Center' },
      ]}
      cta={{
        eyebrow: 'Privacy support',
        title: 'Need help with account data?',
        body: 'Use the Privacy Center for account export or deletion/anonymisation requests, or contact customer care for privacy questions.',
        to: '/privacy-center',
        label: 'Open Privacy Center',
      }}
    />
  );
};

export default PrivacyPage;
