import { Link } from 'react-router-dom';
import { BadgeCheck, HeartHandshake, Shirt } from 'lucide-react';
import { BUSINESS_INFO } from '../utils/businessInfo';

const AboutPage = () => {
  return (
    <div className="bg-[#fff7ee] pb-16">
      <section className="bg-brand-dark px-4 py-10 text-center text-white md:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">About Us</p>
        <h1 className="mt-3 font-serif text-4xl font-bold md:text-5xl">Apex Fashion</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-300 md:text-lg">
          A Sri Lankan online fashion store focused on curated clothing, footwear, accessories, and a smoother customer experience from checkout to delivery.
        </p>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <img
            src="/apex-fashion-mobile-hero.webp"
            alt="Apex Fashion collection"
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg"
          />
          <div className="rounded-2xl bg-white p-6 shadow-[0_18px_40px_rgba(53,26,17,0.08)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">Our Approach</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-brand-dark">Fashion shopping with clearer service details</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-gray-600 sm:text-base">
              <p>
                Apex Fashion sells fashion products online through {BUSINESS_INFO.domain}. We aim to keep product details, prices, delivery costs, payment status, returns, refunds, and customer support information clear before and after purchase.
              </p>
              <p>
                We do not claim formal certifications, exclusive supplier audits, or fixed warranties unless those details are confirmed and shown on the relevant product or policy page.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Shirt,
              title: 'Curated Fashion',
              body: 'Products should include clear names, prices, available sizes, colors, SKUs or variants, and any product-specific restrictions.',
            },
            {
              icon: BadgeCheck,
              title: 'Transparent Checkout',
              body: 'Customers should be able to review the order summary, delivery charge, payment method, and final total before confirming payment.',
            },
            {
              icon: HeartHandshake,
              title: 'Responsive Support',
              body: 'Customer care handles product questions, delivery issues, PayHere payment questions, returns, refunds, and privacy requests.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl bg-white p-6 shadow-[0_18px_40px_rgba(53,26,17,0.08)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold text-brand-dark">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-brand-accent/20 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">Business Information</p>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-gray-600 md:grid-cols-2">
            <div>
              <p><span className="font-semibold text-brand-dark">Trading name:</span> {BUSINESS_INFO.brandName}</p>
              <p><span className="font-semibold text-brand-dark">Legal entity:</span> {BUSINESS_INFO.legalName}</p>
              <p><span className="font-semibold text-brand-dark">Registration number:</span> {BUSINESS_INFO.registrationNumber}</p>
              <p><span className="font-semibold text-brand-dark">VAT/TIN status:</span> {BUSINESS_INFO.taxStatus}</p>
            </div>
            <div>
              <p><span className="font-semibold text-brand-dark">Registered address:</span> {BUSINESS_INFO.registeredAddress}</p>
              <p><span className="font-semibold text-brand-dark">Dispatch/returns address:</span> {BUSINESS_INFO.dispatchAddress}</p>
              <p><span className="font-semibold text-brand-dark">Email:</span> {BUSINESS_INFO.email}</p>
              <p><span className="font-semibold text-brand-dark">Phone:</span> {BUSINESS_INFO.phone}</p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-brand-dark p-6 text-white sm:p-8">
          <h2 className="font-serif text-3xl font-bold">Need product or policy help?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
            Contact Apex Fashion before ordering if you need confirmation about sizing, delivery, returns, refunds, warranty terms, or PayHere payment handling.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-flex rounded-xl bg-brand-accent px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-dark transition-colors hover:bg-white"
          >
            Contact Support
          </Link>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
