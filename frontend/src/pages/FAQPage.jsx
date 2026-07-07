import { HelpCircle, Globe, PackageCheck, ShoppingBag } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';

const FAQPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Frequently Asked Questions"
      title="Helpful answers for shopping, sourcing, and delivery"
      intro="From product quality to wholesale interest, these are the questions customers ask most often when shopping with Apex Link Group."
      highlights={[
        {
          icon: Globe,
          title: 'Ingredient Quality',
          body: 'We focus on premium products across multiple industries, rigorous supplier verification, and protective packaging designed for safe global delivery.',
        },
        {
          icon: PackageCheck,
          title: 'Order Confidence',
          body: 'You can review order progress through your account dashboard, confirmation page, or the Track Order page.',
        },
        {
          icon: ShoppingBag,
          title: 'Premium Shopping',
          body: 'Our goal is to make discovering, ordering, and reordering products feel as polished as the marketplace itself.',
        },
        {
          icon: HelpCircle,
          title: 'Still Need Help?',
          body: 'If your question is not answered here, our support team is ready to help with orders, products, or policy clarifications.',
        },
      ]}
      sections={[
        {
          title: 'How are products quality-checked?',
          body: 'Every supplier is audited before joining the marketplace, and products are verified against category-specific quality standards before dispatch. Certificates and documentation are available on request.',
        },
        {
          title: 'Do you support business and wholesale orders?',
          body: 'Yes. We support wholesale and enterprise procurement across all categories, with volume pricing and dedicated account support.',
        },
        {
          title: 'Can I track my order without logging in?',
          body: 'Yes. Use the Track Order page with your order ID and the email address or phone number associated with the order. Logged-in customers can also jump to full private order details from their account when eligible.',
        },
        {
          title: 'Do you offer wholesale or gifting support?',
          body: 'Yes. If you are ordering for hospitality, events, gifting, or specialty retail, contact us with your requirements and timing so we can advise on suitability and availability.',
        },
        {
          title: 'What if something is wrong with my order?',
          body: 'If your order arrives damaged, incomplete, or below expectation, contact us promptly with your order number and a short explanation. We will review the issue and guide you through the appropriate next step.',
        },
      ]}
      relatedLinks={[
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/returns', label: 'Returns & Refunds' },
        { to: '/contact', label: 'Contact Support' },
      ]}
      cta={{
        eyebrow: 'Need a more specific answer?',
        title: 'Our team can help with product or order questions',
        body: 'If you have a sourcing, ingredient, gifting, or delivery question that is not covered here, send us a message and we will point you in the right direction.',
        to: '/contact',
        label: 'Contact Us',
      }}
    />
  );
};

export default FAQPage;
