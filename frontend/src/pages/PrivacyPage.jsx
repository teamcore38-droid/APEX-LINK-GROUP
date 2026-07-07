import { Database, Lock, ShieldCheck, UserRound } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';

const PrivacyPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Privacy Policy"
      title="Your personal information should feel as carefully handled as your order"
      intro="Apex Link Group uses customer information only to operate the store, fulfill purchases, support delivery, and improve service quality. We aim to collect only what we need and protect it with practical, modern safeguards."
      highlights={[
        {
          icon: UserRound,
          title: 'Data We Collect',
          body: 'We may collect account details, delivery information, order history, and customer service messages when you interact with the store.',
        },
        {
          icon: Database,
          title: 'Why We Use It',
          body: 'Your information helps us fulfill orders, maintain your account, provide support, and prepare relevant shipping or order updates.',
        },
        {
          icon: Lock,
          title: 'Protected Access',
          body: 'Private account, address, and order data are stored behind authenticated application flows and are not intentionally exposed publicly.',
        },
        {
          icon: ShieldCheck,
          title: 'Respectful Handling',
          body: 'We do not treat customer data as a decorative asset. It is used to run the business responsibly and improve your experience.',
        },
      ]}
      sections={[
        {
          title: 'Information we may collect',
          body: 'Depending on how you use the website, we may collect your name, email address, phone number, saved addresses, order history, and the messages you send through our contact or account tools. Basic technical data, such as device or browser details, may also be captured through normal site operations.',
        },
        {
          title: 'How we use your information',
          body: 'We use account and order information to process purchases, deliver packages, support password recovery, maintain your customer account, and help our team respond to order or contact inquiries.',
          points: [
            'Shipping details are used to fulfill and track your delivery.',
            'Account information helps you review orders, save addresses, and manage credentials.',
            'Support messages help our team follow up on product, shipping, or policy questions.',
          ],
        },
        {
          title: 'When information may be shared',
          body: 'We may share limited operational data with service providers that help run the store, such as hosting, delivery, or future payment/email partners. We do not share more than is reasonably necessary for those services to function.',
        },
        {
          title: 'Your account choices',
          body: 'You can update your profile details, manage saved addresses, and review your order history from your account dashboard. If you need help with a privacy request, contact us directly and include enough detail for our team to identify the relevant account or order safely.',
        },
      ]}
      relatedLinks={[
        { to: '/terms', label: 'Terms & Conditions' },
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/contact', label: 'Contact' },
      ]}
      cta={{
        eyebrow: 'Questions about data use?',
        title: 'Reach the customer care team directly',
        body: 'If you need clarification about account information, saved addresses, or how your order data is handled, we are happy to help.',
        to: '/contact',
        label: 'Contact Apex Link Group',
      }}
    />
  );
};

export default PrivacyPage;
