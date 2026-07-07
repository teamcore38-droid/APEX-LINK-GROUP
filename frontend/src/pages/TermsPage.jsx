import { FileText, Gavel, Receipt, Scale } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';

const TermsPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Terms & Conditions"
      title="Clear terms for a premium, trustworthy shopping experience"
      intro="These terms help set expectations around ordering, pricing, account use, and storefront conduct. They are written to support a fair relationship between Apex Link Group and every customer using the site."
      highlights={[
        {
          icon: FileText,
          title: 'Storefront Terms',
          body: 'By using the site, you agree to interact with the storefront and account features in a lawful, respectful, and accurate way.',
        },
        {
          icon: Receipt,
          title: 'Order Accuracy',
          body: 'Customers are responsible for entering correct shipping and contact information at checkout so we can fulfill orders without avoidable delay.',
        },
        {
          icon: Scale,
          title: 'Fair Use',
          body: 'We reserve the right to limit, cancel, or review orders if there is suspected misuse, fraud, or a serious system or pricing error.',
        },
        {
          icon: Gavel,
          title: 'Operational Rights',
          body: 'Product availability, prices, content, and shipping policies may change as the business evolves, subject to applicable law.',
        },
      ]}
      sections={[
        {
          title: 'Using the website',
          body: 'You agree to use the site for legitimate browsing, account, and shopping activity. Attempts to misuse account access, scrape protected areas, interfere with service, or submit deceptive order information may result in restricted access or order cancellation.',
        },
        {
          title: 'Product information and pricing',
          body: 'We aim to present products, origin notes, sizing details, and pricing as accurately as possible. Even so, occasional content or pricing mistakes may occur. If a material error affects your order, we may contact you before dispatch to confirm, adjust, or cancel the order as appropriate.',
        },
        {
          title: 'Orders, fulfillment, and cancellations',
          body: 'Submitting an order does not guarantee final acceptance until it is reviewed and processed. We may cancel or limit orders for stock issues, address problems, suspected misuse, or operational constraints.',
          points: [
            'You should review shipping details carefully before placing the order.',
            'Repeated failed delivery attempts may require customer support follow-up before reshipment.',
            'Refunds or replacements for fulfillment issues are handled under our Returns & Refunds policy.',
          ],
        },
        {
          title: 'Accounts and credentials',
          body: 'You are responsible for keeping your password confidential and for maintaining the accuracy of your account information. If you believe your account access has been compromised, change your password promptly and contact support if needed.',
        },
      ]}
      relatedLinks={[
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/returns', label: 'Returns & Refunds' },
        { to: '/shipping', label: 'Shipping Policy' },
      ]}
      cta={{
        eyebrow: 'Need clarification before ordering?',
        title: 'We can answer policy and account questions directly',
        body: 'If you are ordering for gifting, hospitality, or specialty use and want guidance before purchase, our support team can help.',
        to: '/contact',
        label: 'Ask a Question',
      }}
    />
  );
};

export default TermsPage;
