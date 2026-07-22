import { CreditCard, HelpCircle, PackageCheck, ShoppingBag } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO } from '../utils/businessInfo';

const FAQPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Frequently Asked Questions"
      title="Helpful answers for Apex Fashion customers"
      intro="These answers cover common questions about fashion products, sizing, PayHere payments, delivery, returns, refunds, account privacy, and customer support."
      highlights={[
        {
          icon: ShoppingBag,
          title: 'Product Details',
          body: 'Review product names, photos, size, color, SKU, price, stock, and any restrictions before ordering.',
        },
        {
          icon: CreditCard,
          title: 'PayHere Payments',
          body: 'Payment is confirmed only after Apex Fashion verifies PayHere server notification data.',
        },
        {
          icon: PackageCheck,
          title: 'Order Tracking',
          body: 'Use Track Order or your account dashboard to check order, payment, fulfilment, and delivery updates.',
        },
        {
          icon: HelpCircle,
          title: 'Customer Care',
          body: 'Contact support with your order ID for delivery issues, returns, refunds, payment questions, or privacy requests.',
        },
      ]}
      sections={[
        {
          title: 'When is my order confirmed?',
          body: 'Your order is placed when checkout is submitted, but payment is confirmed only after PayHere sends a verified payment notification to Apex Fashion. If payment is pending, the order may not be dispatched yet.',
        },
        {
          title: 'Can I pay without PayHere?',
          body: '[BUSINESS OWNER TO CONFIRM: whether cash on delivery, bank transfer, or other manual payment methods are offered]. If PayHere is the only live method, customers should complete payment through PayHere checkout.',
        },
        {
          title: 'How do I choose the right size?',
          body: '[BUSINESS OWNER TO CONFIRM: final size guide, measurement instructions, and whether size exchanges are offered]. Product-specific size, fit, and material details should be reviewed before checkout.',
        },
        {
          title: 'How long will delivery take?',
          body: `Delivery depends on payment confirmation, stock, courier serviceability, and the customer address. Standard dispatch: ${BUSINESS_INFO.dispatchTimeline}. Standard delivery estimate: ${BUSINESS_INFO.deliveryTimeline}.`,
        },
        {
          title: 'Can I track my order without logging in?',
          body: 'Yes. Use the Track Order page with the order ID and the email address or phone number associated with the order. Logged-in customers can also review eligible private order details from their account.',
        },
        {
          title: 'What if my item is damaged, defective, or wrong?',
          body: 'Contact customer care promptly with the order ID, item details, and photos of the product and packaging. Resolutions are handled under the Refund & Return Policy and applicable consumer-protection rights.',
        },
        {
          title: 'How do refunds work with PayHere?',
          body: 'Approved PayHere card refunds are returned to the original card where supported. Same-day refunds may appear as a payment void, while delayed refunds can take 5 to 10 days or longer after PayHere processes them. Non-card PayHere refunds may need manual handling.',
        },
        {
          title: 'How can I manage privacy or cookie choices?',
          body: 'Optional analytics and advertising tracking are currently disabled. You can clear necessary website storage through your browser settings. Logged-in customers can use the Privacy Center for data export or deletion/anonymisation requests, or contact customer care for privacy support.',
        },
      ]}
      relatedLinks={[
        { to: '/payment-policy', label: 'Payment Policy' },
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/returns', label: 'Refund & Return Policy' },
        { to: '/privacy', label: 'Privacy Policy' },
      ]}
      cta={{
        eyebrow: 'Need a specific answer?',
        title: 'Send us your order or product question',
        body: 'Include your order ID, item name, size, color, and the email or phone number used at checkout when relevant.',
        to: '/contact',
        label: 'Contact Support',
      }}
    />
  );
};

export default FAQPage;
