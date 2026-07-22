import { CreditCard, LockKeyhole, Receipt, RefreshCcw } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const PaymentPolicyPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Payment Policy"
      title="PayHere payment terms for Apex Fashion orders"
      intro={`${policyUpdateNote} This policy explains how online payments, PayHere redirects, payment confirmations, failed payments, refunds, disputes, and chargebacks are handled on ${BUSINESS_INFO.domain}.`}
      highlights={[
        {
          icon: CreditCard,
          title: 'PayHere Checkout',
          body: 'Customers are redirected to PayHere checkout to enter payment details securely. Apex Fashion receives payment status after PayHere sends a server callback.',
        },
        {
          icon: LockKeyhole,
          title: 'Verified Confirmation',
          body: 'An order is marked paid only after Apex Fashion verifies PayHere notification data, including merchant ID, order ID, amount, currency, status code, and checksum.',
        },
        {
          icon: Receipt,
          title: 'Order Record',
          body: 'Receipts and invoices show the order total, payment provider, payment method, payment status, paid date, and refund status where available.',
        },
        {
          icon: RefreshCcw,
          title: 'Refund Handling',
          body: 'Approved card refunds should be issued through PayHere where supported. PayHere non-card refunds may need manual handling by Apex Fashion.',
        },
      ]}
      sections={[
        {
          title: 'Accepted payment method',
          body: 'The website currently uses PayHere for online checkout. PayHere may support cards, wallets, internet banking, or other methods depending on PayHere availability, merchant approval, customer eligibility, and the payment options enabled for Apex Fashion.',
        },
        {
          title: 'PayHere redirect flow',
          body: 'After you place an order, Apex Fashion prepares a PayHere checkout request and redirects you to PayHere. You enter payment credentials on PayHere, not directly on Apex Fashion. The PayHere return page only brings you back to the website; payment status is confirmed through PayHere server notification.',
          points: [
            'Do not close the PayHere or Apex Fashion confirmation page until you see the next step.',
            'If the order page says payment is pending, Apex Fashion may still be waiting for PayHere confirmation.',
            'If payment was deducted but the order does not show as paid, contact customer care with the order ID and any PayHere reference.',
          ],
        },
        {
          title: 'Payment confirmation',
          body: 'PayHere sends status data to Apex Fashion through a notify URL. Apex Fashion verifies the signature/checksum and validates that the merchant ID, order ID, amount, and currency match the order before changing the payment status.',
          points: [
            'PayHere status 2 means success.',
            'PayHere status 0 means pending.',
            'PayHere status -1 means cancelled.',
            'PayHere status -2 means failed.',
            'PayHere status -3 means charged back.',
          ],
        },
        {
          title: 'Failed, cancelled, and pending payments',
          body: 'If PayHere reports a payment as failed or cancelled, Apex Fashion may keep the order unpaid, cancel fulfilment, release reserved stock, or ask you to retry checkout. Pending payments are not treated as paid until PayHere sends a successful verified notification.',
        },
        {
          title: 'Duplicate or inconsistent payment notifications',
          body: 'Apex Fashion may ignore duplicate successful PayHere notifications for the same payment reference. If a payment notification appears to relate to a different order, different amount, different currency, invalid signature, or mismatched merchant ID, Apex Fashion may reject the notification and keep the order unpaid until the issue is reviewed.',
        },
        {
          title: 'Refunds through PayHere',
          body: 'If a refund is approved under the Refund & Return Policy, Apex Fashion will process it to the original payment channel where possible.',
          points: [
            'PayHere card refunds can be initiated through the PayHere account or API where merchant permissions and payment method allow it.',
            'A same-day card refund before settlement may appear as an instant void.',
            'A delayed card refund can take 5 to 10 days or longer to appear after PayHere processes it.',
            'If the original PayHere payment used a non-card method, PayHere states that the merchant must process the refund manually.',
          ],
        },
        {
          title: 'Chargebacks and disputes',
          body: 'A chargeback may occur when a cardholder disputes a payment with the card issuer. If PayHere or a bank reports a chargeback, Apex Fashion may update the order status, pause fulfilment, request supporting information from the customer, and provide order/payment records to PayHere, the bank, or relevant authorities.',
        },
        {
          title: 'Payment security and customer care',
          body: `Apex Fashion does not ask customers to send card numbers, CVV values, one-time passwords, PayHere login details, or banking passwords by email, WhatsApp, phone, or contact form. If you suspect payment fraud, contact ${BUSINESS_INFO.email} immediately and also contact your bank or payment provider.`,
        },
        {
          title: 'Currency, tax, and invoice status',
          body: `Orders are currently expected to be charged in LKR unless otherwise shown at checkout. VAT/TIN status: ${BUSINESS_INFO.taxStatus}. Tax-invoice wording and tax disclosures must be confirmed by the business owner before publication.`,
        },
      ]}
      relatedLinks={[
        { to: '/returns', label: 'Refund & Return Policy' },
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/terms', label: 'Terms & Conditions' },
      ]}
      cta={{
        eyebrow: 'Payment question?',
        title: 'We can help trace a PayHere payment',
        body: 'Send your order ID, checkout email or phone, approximate payment time, amount, and any PayHere reference shown to you.',
        to: '/contact',
        label: 'Contact Support',
      }}
    />
  );
};

export default PaymentPolicyPage;
