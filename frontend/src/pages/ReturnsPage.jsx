import { BadgeCheck, PackageSearch, RefreshCcw, ShieldAlert } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const ReturnsPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Refund & Return Policy"
      title="Fair return and refund handling for fashion orders"
      intro={`${policyUpdateNote} This policy explains how Apex Fashion handles returns, exchanges, cancellations, damaged items, incorrect items, refunds, and PayHere refund timing.`}
      highlights={[
        {
          icon: PackageSearch,
          title: 'Review Window',
          body: `Return and exchange requests must use this confirmed business window: ${BUSINESS_INFO.returnWindow}.`,
        },
        {
          icon: BadgeCheck,
          title: 'Condition Check',
          body: 'Fashion items should be unused, unworn, unwashed, undamaged, and returned with original labels, tags, accessories, and packaging unless the issue is a defect or fulfilment error.',
        },
        {
          icon: RefreshCcw,
          title: 'Refund Method',
          body: 'Approved PayHere card refunds should be returned to the original card where possible. Non-card PayHere refunds may need manual processing.',
        },
        {
          icon: ShieldAlert,
          title: 'Consumer Rights',
          body: 'This policy does not limit mandatory rights for damaged, dangerous, defective, misdescribed, or incorrectly supplied goods under applicable Sri Lankan law.',
        },
      ]}
      sections={[
        {
          title: 'Before requesting a return',
          body: 'Please inspect your order promptly after delivery and keep the parcel, tags, labels, invoice, and packaging until you are satisfied. To request help, contact customer care with your order number, the item name, size, color, SKU if available, and photos where the issue is visible.',
        },
        {
          title: 'Eligible return or exchange requests',
          body: 'Apex Fashion will review requests case by case according to the product condition, order records, payment status, delivery records, and applicable consumer-protection requirements.',
          points: [
            'Wrong item, size, color, quantity, or SKU supplied by Apex Fashion.',
            'Item received damaged, defective, materially different from the product description, or unsafe for ordinary use.',
            `Size exchange or change-of-mind return only if Apex Fashion confirms it is offered for the relevant product category and within: ${BUSINESS_INFO.exchangeWindow}.`,
            'Order cancellation before dispatch where operationally possible and where the payment can be cancelled or refunded.',
          ],
        },
        {
          title: 'Items that may be restricted',
          body: 'Some fashion categories may be unsuitable for change-of-mind return or exchange for hygiene, safety, customisation, or resale-condition reasons. Apex Fashion should clearly disclose any non-returnable category on the product page or before checkout.',
          points: [
            'Used, worn, washed, altered, damaged by the customer, or tag-removed items may be refused unless the issue is a verified defect or fulfilment error.',
            'Intimate apparel, pierced jewellery, cosmetics, fragrances, customised items, final-sale items, or hygiene-sensitive accessories may be restricted where clearly disclosed and legally permitted.',
            'Customer-entered address errors, refused delivery, or repeated failed delivery attempts may affect eligibility for delivery-fee refunds.',
          ],
        },
        {
          title: 'How to submit a request',
          body: `Contact ${BUSINESS_INFO.email} or use the Contact page. Include the order ID, customer name, email/phone used at checkout, item details, reason, preferred resolution, and clear photos where relevant. Return address: ${BUSINESS_INFO.dispatchAddress}.`,
        },
        {
          title: 'Assessment and resolution',
          body: 'After reviewing the request, Apex Fashion may offer repair where appropriate, replacement, exchange, store credit if offered and agreed, refund, or another fair resolution. If the issue is a confirmed Apex Fashion fulfilment error or defective product, customer care should explain the return shipping arrangement before the item is sent back.',
        },
        {
          title: 'Refund processing',
          body: `Approved refunds are processed after Apex Fashion confirms eligibility and, where required, receives and inspects the returned item. Apex internal processing timeline: ${BUSINESS_INFO.refundProcessingTime}.`,
          points: [
            'PayHere card payments: approved refunds should be initiated through PayHere where supported and returned to the original card.',
            'PayHere instant refunds may appear as a real-time payment void when refunded on the same day before settlement.',
            'PayHere delayed refunds may take 5 to 10 days or longer to appear on the customer card after PayHere processes the refund.',
            'PayHere non-card payments may require Apex Fashion to process the refund manually because PayHere states its technical refund facility is for card payments.',
          ],
        },
        {
          title: 'Shipping fees and deductions',
          body: 'Original delivery fees, return delivery fees, and any delivery-related deductions depend on the reason for the return and the final decision by customer care. Apex Fashion should not deduct charges where doing so would be inconsistent with applicable consumer-protection law or a confirmed fulfilment error.',
        },
        {
          title: 'Failed refunds, disputes, and chargebacks',
          body: 'If a refund does not appear within the expected banking timeframe, contact customer care with the order ID and PayHere payment reference if available. If a payment is disputed through a card issuer, the order may be marked as charged back while PayHere, the bank, and Apex Fashion review the matter.',
        },
      ]}
      relatedLinks={[
        { to: '/payment-policy', label: 'Payment Policy' },
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/terms', label: 'Terms & Conditions' },
        { to: '/contact', label: 'Contact Support' },
      ]}
      cta={{
        eyebrow: 'Need a resolution?',
        title: 'Start with your order details',
        body: 'For the fastest review, include your order ID, item details, photos, and the email or phone number used at checkout.',
        to: '/contact',
        label: 'Request Support',
      }}
    />
  );
};

export default ReturnsPage;
