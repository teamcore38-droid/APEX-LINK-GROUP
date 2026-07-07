import { Clock3, Globe2, ShieldCheck, Truck } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';

const ShippingPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Shipping Policy"
      title="Protective shipping designed for premium products"
      intro="Every Apex Link Group order is packed to protect its quality, condition, and value. Our shipping policy is built to keep your business and home supplied quickly while preserving the premium experience from shelf to doorstep."
      highlights={[
        {
          icon: Truck,
          title: 'Fast Dispatch',
          body: 'Most paid orders are hand-packed and dispatched within 1 to 2 business days, excluding public holidays and large seasonal promotions.',
        },
        {
          icon: Clock3,
          title: 'Clear Delivery Windows',
          body: 'Typical delivery time is 3 to 5 business days after dispatch, with longer timelines possible for remote regions and peak carrier periods.',
        },
        {
          icon: ShieldCheck,
          title: 'Protected Packaging',
          body: 'We use sealed, freshness-conscious packaging that helps preserve fragrance, reduce moisture exposure, and protect presentation during transit.',
        },
        {
          icon: Globe2,
          title: 'Regional Coverage',
          body: 'Delivery availability depends on carrier serviceability. If an address needs special handling, our support team will contact you before dispatch.',
        },
      ]}
      sections={[
        {
          title: 'Order processing timeline',
          body: 'Orders are reviewed, packed, and labeled in the sequence they are received. Orders containing multiple items may be consolidated into one shipment whenever it improves delivery efficiency and presentation.',
          points: [
            'Orders placed after business hours are processed on the next business day.',
            'Address verification or stock confirmation may add a short review step before dispatch.',
            'Large gifting, bulk, or custom requests may need additional fulfillment time.',
          ],
        },
        {
          title: 'Shipping rates and thresholds',
          body: 'Shipping charges are calculated at checkout based on your order value, delivery region, and current promotional thresholds. Any free-shipping offers shown during checkout apply only when the cart meets the stated conditions.',
          points: [
            'Shipping costs are displayed before order confirmation.',
            'Taxes, duties, or regional delivery fees may be shown separately where applicable.',
            'Carrier surcharges for remote zones are disclosed at checkout whenever possible.',
          ],
        },
        {
          title: 'Tracking and delivery updates',
          body: 'Once your order is dispatched, tracking details and fulfillment notes become available through your order confirmation page, account dashboard, and the public Track Order page.',
          points: [
            'Tracking numbers appear as soon as the carrier confirms pickup.',
            'Delivery notes may include packaging updates, courier instructions, or fulfillment comments.',
            'If a delivery attempt fails, please contact us promptly so we can help coordinate redelivery.',
          ],
        },
        {
          title: 'Damaged or delayed shipments',
          body: 'If your order arrives damaged, incomplete, or materially delayed, contact our team with your order number and a brief description of the issue. We will review the shipment and guide you on replacement or next steps.',
        },
      ]}
      relatedLinks={[
        { to: '/returns', label: 'Returns & Refunds' },
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/faq', label: 'FAQ' },
      ]}
      cta={{
        eyebrow: 'Need help before ordering?',
        title: 'Plan ahead for gifting, hospitality, or wholesale orders',
        body: 'If you need timing guidance for a larger order, our team can help you estimate dispatch and delivery expectations before checkout.',
        to: '/contact',
        label: 'Contact the Team',
      }}
    />
  );
};

export default ShippingPage;
