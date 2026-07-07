import { BadgeCheck, PackageSearch, RefreshCcw, ShieldAlert } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';

const ReturnsPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Returns & Refunds"
      title="A thoughtful returns policy for premium products"
      intro="Because our marketplace spans food products, electronics, and industrial goods, return handling is tailored to each category with product safety and customer care in mind. If something is wrong with your order, we want to resolve it fairly, quickly, and with clear expectations."
      highlights={[
        {
          icon: BadgeCheck,
          title: 'Quality Guarantee',
          body: 'If your order arrives damaged, incorrect, or below expected quality, our support team will review it promptly and help make it right.',
        },
        {
          icon: PackageSearch,
          title: 'Review Window',
          body: 'Please contact us within 14 days of delivery so we can investigate the issue while shipment and product details are still current.',
        },
        {
          icon: RefreshCcw,
          title: 'Resolution Options',
          body: 'Depending on the issue, we may offer a replacement, store credit, or refund to the original payment method.',
        },
        {
          icon: ShieldAlert,
          title: 'Food Safety First',
          body: 'Opened or heavily used items are generally not returnable unless there is a verified quality concern or fulfillment error.',
        },
      ]}
      sections={[
        {
          title: 'What qualifies for support',
          body: 'We are happy to review issues such as transit damage, fulfillment mistakes, missing items, or serious freshness concerns. To help us act quickly, include your order number and a short explanation when you contact us.',
          points: [
            'Photos of the parcel and product are helpful when there is visible damage.',
            'If a gift order had a presentation issue, tell us which item was affected.',
            'If a delivery was incomplete, mention the missing item names and quantities.',
          ],
        },
        {
          title: 'Items that may not be eligible',
          body: 'For safety and quality reasons, we may limit returns on opened consumable products unless the concern relates to damage, authenticity, or a documented fulfillment issue.',
          points: [
            'Products opened and consumed substantially may not qualify for a standard refund.',
            'Requests made long after delivery may be harder to verify.',
            'Misuse, improper storage, or customer-entered address errors may affect eligibility.',
          ],
        },
        {
          title: 'How refunds are processed',
          body: 'Once a refund is approved, we issue it to the original payment method. Processing timelines vary by bank or card provider, so the visible credit may take several business days to appear.',
        },
        {
          title: 'How to request help',
          body: 'Use our Contact page and include your order number, the issue you experienced, and any supporting photos if relevant. Our team will reply with the next step, whether that is a replacement, return guidance, or refund confirmation.',
        },
      ]}
      relatedLinks={[
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/faq', label: 'FAQ' },
        { to: '/terms', label: 'Terms & Conditions' },
      ]}
      cta={{
        eyebrow: 'Need a quick resolution?',
        title: 'Our team can review order issues directly',
        body: 'If your order arrived damaged, incomplete, or unusually delayed, contact us with your order ID and we will guide you through the best next step.',
        to: '/contact',
        label: 'Request Support',
      }}
    />
  );
};

export default ReturnsPage;
