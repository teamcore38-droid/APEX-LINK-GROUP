import { Cookie, Settings, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const CookiePolicyPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Cookie Policy"
      title="How Apex Fashion uses cookies and similar storage"
      intro={`${policyUpdateNote} This policy explains how ${BUSINESS_INFO.domain} uses cookies, local storage, session identifiers, and consent records for checkout, security, analytics, marketing, and personalisation.`}
      highlights={[
        {
          icon: Cookie,
          title: 'Necessary Storage',
          body: 'Some cookies or local storage are needed for checkout, account security, cart state, privacy choices, and ordinary website operation.',
        },
        {
          icon: SlidersHorizontal,
          title: 'Optional Choices',
          body: 'Analytics, marketing, and personalisation preferences are controlled through the cookie banner and should be honoured according to your saved choices.',
        },
        {
          icon: ShieldCheck,
          title: 'Consent Records',
          body: 'Consent choices may be recorded with a consent version, session ID, IP address, browser information, and selected preference categories.',
        },
        {
          icon: Settings,
          title: 'Manage Preferences',
          body: 'You can choose necessary-only storage, accept all optional categories, clear browser storage, or contact customer care for help changing preferences.',
        },
      ]}
      sections={[
        {
          title: 'What cookies are',
          body: 'Cookies and similar technologies are small pieces of information stored by your browser or device. Local storage and session identifiers can perform similar functions even where they are not traditional browser cookies.',
        },
        {
          title: 'Categories used by this website',
          body: 'Apex Fashion currently presents customers with necessary, analytics, marketing, and personalisation choices.',
          points: [
            'Necessary: required for checkout, cart/session behaviour, account security, privacy consent records, error handling, and basic site functions.',
            'Analytics: helps understand site traffic, page performance, product interest, and service improvement where enabled.',
            'Marketing: supports promotional measurement, newsletter flows, advertising, or campaign attribution where enabled.',
            'Personalisation: supports remembered preferences and experience improvements where enabled.',
          ],
        },
        {
          title: 'Current consent implementation',
          body: 'The cookie banner stores consent locally under the key apexCookieConsent and records a session identifier under apexConsentSessionId. The website also submits consent choices to the backend privacy endpoint so Apex Fashion can keep a consent record.',
        },
        {
          title: 'Third-party services',
          body: 'Third-party providers may set or read cookies or similar storage if their services are enabled on the website. This may include payment, hosting, analytics, advertising, email, security, or customer-support providers.',
          points: [
            'PayHere may process payment-session and checkout information when customers are redirected to PayHere.',
            'Analytics or marketing tools should be activated only according to consent preferences and applicable law.',
            '[BUSINESS OWNER TO CONFIRM: full list of analytics, advertising, chat, tracking, and customer-support tools used on the production website].',
          ],
        },
        {
          title: 'How to manage cookies',
          body: 'You can use the website banner to accept all optional categories, save selected choices, or continue with necessary-only storage. You can also delete cookies and local storage through your browser settings. Some website functions may not work properly if necessary storage is disabled in the browser.',
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
