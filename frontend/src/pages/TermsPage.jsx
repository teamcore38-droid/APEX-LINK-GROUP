import { FileText, Gavel, Receipt, Scale } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { BUSINESS_INFO, policyUpdateNote } from '../utils/businessInfo';

const TermsPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Terms & Conditions"
      title="Terms for shopping with Apex Fashion"
      intro={`${policyUpdateNote} These terms apply when you browse ${BUSINESS_INFO.domain}, create an account, place an order, pay through PayHere, request delivery, or contact Apex Fashion customer care.`}
      highlights={[
        {
          icon: FileText,
          title: 'Business Identity',
          body: `Trading name: ${BUSINESS_INFO.brandName}. Legal entity, business registration number, VAT/TIN status, and registered address must be confirmed by the business owner.`,
        },
        {
          icon: Receipt,
          title: 'Order Review',
          body: 'Before confirming an order, customers should be able to review products, quantities, delivery details, payment method, charges, and final total.',
        },
        {
          icon: Scale,
          title: 'Fair Terms',
          body: 'Product, pricing, delivery, return, refund, warranty, and dispute information should be clear before purchase and should not mislead customers.',
        },
        {
          icon: Gavel,
          title: 'Sri Lankan Law',
          body: 'These terms are written for a Sri Lankan fashion e-commerce business and preserve mandatory consumer rights under applicable Sri Lankan law.',
        },
      ]}
      sections={[
        {
          title: 'Business information',
          body: `${BUSINESS_INFO.brandName} is the trading name used on this website. Legal entity: ${BUSINESS_INFO.legalName}. Business registration number: ${BUSINESS_INFO.registrationNumber}. VAT/TIN status: ${BUSINESS_INFO.taxStatus}. Registered address: ${BUSINESS_INFO.registeredAddress}. Customer care: ${BUSINESS_INFO.email}, ${BUSINESS_INFO.phone}.`,
        },
        {
          title: 'Using the website',
          body: 'You may use the website only for lawful browsing, account management, shopping, order tracking, returns, support, and other ordinary customer activity. You must not misuse accounts, interfere with the website, attempt unauthorised access, submit fraudulent information, scrape protected areas, or use the website in a way that violates applicable law or third-party rights.',
        },
        {
          title: 'Accounts and customer information',
          body: 'Customers are responsible for keeping account credentials secure and for entering accurate contact, billing, and shipping information. If the information you provide is incorrect or incomplete, delivery, payment confirmation, refund processing, or customer support may be delayed.',
        },
        {
          title: 'Products, descriptions, size, and availability',
          body: 'Apex Fashion aims to describe fashion products accurately, including available sizes, colors, variants, SKU information, price, stock status, and product images. Product colours and fit may vary slightly because of display settings, photography, manufacturing differences, and body measurements. Stock is subject to availability until the order is accepted and processed.',
        },
        {
          title: 'Pricing and charges',
          body: 'Prices are shown in Sri Lankan Rupees unless the website states otherwise. The checkout summary should show the product subtotal, shipping fee, discounts where applicable, and the final amount before you confirm payment. Apex Fashion does not currently show a tax row unless tax status and tax-invoice requirements are confirmed by the business owner.',
          points: [
            'If a clear pricing or stock error affects an order, we may contact you before dispatch to correct, cancel, or refund the affected order according to applicable law.',
            'VAT/TIN status and tax-invoice wording must be confirmed before publishing tax-specific claims.',
          ],
        },
        {
          title: 'Order placement and acceptance',
          body: 'Placing an order creates a request to purchase the selected products. Order acceptance is subject to payment confirmation, stock availability, fraud screening, delivery serviceability, and any manual review needed for the order. Apex Fashion may cancel or limit an order where permitted by law, including for suspected fraud, unavailable stock, incorrect address details, payment failure, or a material website error.',
        },
        {
          title: 'Electronic records and communications',
          body: 'You agree that order confirmations, invoices, payment-status pages, email notices, privacy notices, and other website communications may be provided electronically. You should save or print important records for your own reference.',
        },
        {
          title: 'Payment terms',
          body: 'PayHere is the current online payment provider. Payment is treated as confirmed only after Apex Fashion receives and verifies PayHere payment notification data. See the Payment Policy for failed payments, cancelled payments, pending payments, refunds, chargebacks, and PayHere-specific terms.',
        },
        {
          title: 'Delivery, cancellation, returns, and refunds',
          body: 'Delivery terms are explained in the Shipping & Delivery Policy. Return, exchange, cancellation, refund, damaged item, incorrect item, and consumer redress terms are explained in the Refund & Return Policy. Nothing in these terms is intended to remove rights that cannot be excluded under applicable Sri Lankan consumer protection law.',
        },
        {
          title: 'Reviews, promotions, and marketing',
          body: 'Reviews and ratings should reflect genuine customer experience. Promotional offers should state eligibility, duration, and material conditions. Marketing emails, SMS, or similar commercial messages should be sent only where permitted and should provide a practical opt-out mechanism.',
        },
        {
          title: 'Intellectual property',
          body: 'The website design, product content, photographs, brand marks, code, and written materials belong to Apex Fashion or its licensors unless otherwise stated. You may not copy, reproduce, resell, or misuse website content except for personal shopping and lawful reference.',
        },
        {
          title: 'Liability',
          body: 'Apex Fashion is responsible for operating the website with reasonable skill and care and for honouring applicable consumer rights. To the fullest extent permitted by law, Apex Fashion is not responsible for losses caused by events outside reasonable control, customer-entered errors, unauthorised account use, third-party payment or courier outages, or indirect losses that were not reasonably foreseeable.',
        },
        {
          title: 'Disputes and governing law',
          body: 'These terms are governed by the laws of Sri Lanka, subject to mandatory consumer-protection rights. If you have a dispute, please contact customer care first with your order number and supporting details. If the issue cannot be resolved, customers may seek redress through the appropriate Sri Lankan consumer protection, payment, court, or regulatory channels.',
        },
      ]}
      relatedLinks={[
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/payment-policy', label: 'Payment Policy' },
        { to: '/returns', label: 'Returns & Refunds' },
        { to: '/shipping', label: 'Shipping Policy' },
      ]}
      cta={{
        eyebrow: 'Before ordering',
        title: 'Need clarification on a product or policy?',
        body: 'Contact customer care before checkout if you need confirmation about sizing, delivery, returns, refunds, or payment handling.',
        to: '/contact',
        label: 'Contact Support',
      }}
    />
  );
};

export default TermsPage;
