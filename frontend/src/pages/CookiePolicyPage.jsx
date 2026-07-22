import { Cookie, Settings, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const CookiePolicyPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Cookie Policy"
      title="How Apex Fashion uses cookies and similar storage"
      intro={`${policyUpdateNote} This policy explains how ${BUSINESS_INFO.domain} uses necessary cookies, local storage, and session identifiers for checkout, security, and ordinary website operation.`}
      highlights={[
        {
          icon: Cookie,
          title: 'Necessary Storage',
          body: 'Some cookies or local storage are needed for checkout, account security, cart state, privacy choices, and ordinary website operation.',
        },
        {
          icon: SlidersHorizontal,
          title: 'Optional Tracking Disabled',
          body: 'The storefront does not currently activate optional analytics, advertising pixels, or tracking-based personalisation.',
        },
        {
          icon: ShieldCheck,
          title: 'Privacy by Default',
          body: 'Removing the preference banner does not enable optional tracking. Those integrations remain disabled in the application.',
        },
        {
          icon: Settings,
          title: 'Browser Controls',
          body: 'You can inspect or clear cookies and local storage through your browser settings, or contact customer care for assistance.',
        },
      ]}
      sections={[
        {
          title: 'What cookies are',
          body: 'Cookies and similar technologies are small pieces of information stored by your browser or device. Local storage and session identifiers can perform similar functions even where they are not traditional browser cookies.',
        },
        {
          title: 'Categories used by this website',
          body: 'Apex Fashion currently uses necessary browser storage. Optional tracking categories remain disabled.',
          points: [
            'Necessary storage supports checkout, cart/session behaviour, account security, error handling, and basic site functions.',
            'Optional analytics and advertising pixels are not loaded by the storefront.',
            'Newsletter subscription remains a separate, voluntary action submitted through the newsletter form.',
          ],
        },
        {
          title: 'Current consent implementation',
          body: 'The storefront no longer displays an automatic cookie-preference banner. Previously stored optional preferences are ignored, and optional analytics, marketing, and personalisation tracking remain disabled.',
        },
        {
          title: 'Third-party services',
          body: 'Third-party providers may set or read cookies or similar storage if their services are enabled on the website. This may include payment, hosting, analytics, advertising, email, security, or customer-support providers.',
          points: [
            'PayHere may process payment-session and checkout information when customers are redirected to PayHere.',
            'Analytics or marketing tools must not be activated unless Apex Fashion introduces an appropriate consent mechanism and updates this policy.',
            '[BUSINESS OWNER TO CONFIRM: full list of analytics, advertising, chat, tracking, and customer-support tools used on the production website].',
          ],
        },
        {
          title: 'How to manage cookies',
          body: 'You can delete cookies and local storage through your browser settings. Some website functions may not work properly if necessary storage is disabled in the browser. Contact customer care if you need help identifying stored website data.',
        },
        {
          title: 'Updates to this policy',
          body: 'Apex Fashion should update this policy whenever the website adds or removes analytics, advertising, chat, fraud-prevention, payment, or personalisation tools that materially change cookie or storage use.',
        },
      ]}
      relatedLinks={[
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/privacy-center', label: 'Privacy Center' },
        { to: '/terms', label: 'Terms & Conditions' },
        { to: '/contact', label: 'Contact Support' },
      ]}
      cta={{
        eyebrow: 'Cookie questions',
        title: 'Need help changing preferences?',
        body: 'Contact customer care if you need help understanding or updating cookie and privacy choices.',
        to: '/contact',
        label: 'Contact Support',
      }}
    />
  );
};

export default CookiePolicyPage;
