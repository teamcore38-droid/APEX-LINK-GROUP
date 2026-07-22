import { Clock3, Globe2, ShieldCheck, Truck } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const ShippingPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Shipping & Delivery Policy"
      title="Delivery terms for Apex Fashion orders"
      intro={`${policyUpdateNote} This policy explains how Apex Fashion processes, dispatches, tracks, and handles delivery issues for Sri Lankan fashion e-commerce orders.`}
      highlights={[
        {
          icon: Truck,
          title: 'Dispatch Timing',
          body: `Orders should dispatch after payment confirmation and stock review. Confirmed dispatch timeline: ${BUSINESS_INFO.dispatchTimeline}.`,
        },
        {
          icon: Clock3,
          title: 'Delivery Estimate',
          body: `Standard delivery estimate: ${BUSINESS_INFO.deliveryTimeline}. Timelines may vary by district, courier, public holidays, promotions, and weather or operational disruption.`,
        },
        {
          icon: ShieldCheck,
          title: 'Checkout Disclosure',
          body: 'Customers should be able to review delivery address, shipping fee, delivery method, and final order total before confirming payment.',
        },
        {
          icon: Globe2,
          title: 'Sri Lanka Coverage',
          body: 'Delivery coverage depends on courier serviceability and the shipping options available at checkout for the customer address.',
        },
      ]}
      sections={[
        {
          title: 'Order processing',
          body: 'Orders are processed after PayHere payment confirmation is received and verified, or after any approved manual payment status is confirmed by Apex Fashion. Processing may be delayed if payment is pending, payment fails, fraud review is triggered, stock needs review, or address details are incomplete.',
        },
        {
          title: 'Shipping fees and delivery summary',
          body: 'Shipping fees are calculated and displayed at checkout before the customer confirms the transaction. Any free-shipping offer, delivery charge, courier charge, discount, or condition should be clearly visible before payment.',
          points: [
            'The customer is responsible for checking the delivery address, phone number, and recipient name before confirming an order.',
            'Apex Fashion should not hide compulsory delivery charges or routinely applicable fees at checkout.',
            'If a delivery charge changes because of address correction or special handling, customer care should contact the customer before dispatch.',
          ],
        },
        {
          title: 'Delivery areas and couriers',
          body: `Apex Fashion may use third-party logistics providers to deliver orders. Courier/provider list: [BUSINESS OWNER TO CONFIRM: courier partners]. Dispatch or return location: ${BUSINESS_INFO.dispatchAddress}.`,
        },
        {
          title: 'Tracking and notifications',
          body: 'Where tracking is available, Apex Fashion will show or send the tracking number, courier name, tracking URL, or delivery notes through the order page, email, or customer account. Tracking details may appear only after courier pickup or label confirmation.',
        },
        {
          title: 'Failed delivery attempts',
          body: 'If delivery fails because the recipient is unavailable, contact details are incorrect, the address is incomplete, or the parcel is refused, customer care may contact the customer for clarification. Redelivery fees, return-to-sender fees, or cancellation/refund handling should be explained before any additional charge is applied.',
        },
        {
          title: 'Delays and events outside control',
          body: 'Delivery may be delayed by courier disruption, public holidays, severe weather, civil disruption, customs/import issues, payment-review delays, high promotional volume, or other events outside reasonable control. Apex Fashion should keep customers informed where a material delay is known.',
        },
        {
          title: 'Damaged, missing, or incorrect deliveries',
          body: 'If a parcel arrives damaged, incomplete, or incorrect, contact customer care promptly with the order ID, photos of the packaging and product, and a description of the issue. Resolutions are handled under the Refund & Return Policy and applicable consumer-protection rights.',
        },
        {
          title: 'International delivery',
          body: '[BUSINESS OWNER TO CONFIRM: whether Apex Fashion ships outside Sri Lanka. If international shipping is offered, confirm customer responsibility for customs duties, import restrictions, taxes, delivery estimates, and return logistics before publication.]',
        },
      ]}
      relatedLinks={[
        { to: '/returns', label: 'Returns & Refunds' },
        { to: '/payment-policy', label: 'Payment Policy' },
        { to: '/terms', label: 'Terms & Conditions' },
        { to: '/contact', label: 'Contact Support' },
      ]}
      cta={{
        eyebrow: 'Delivery support',
        title: 'Need help with an order in transit?',
        body: 'Contact customer care with your order ID and the email or phone number used during checkout.',
        to: '/contact',
        label: 'Contact Support',
      }}
    />
  );
};

export default ShippingPage;
