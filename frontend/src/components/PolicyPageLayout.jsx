import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const PolicyPageLayout = ({
  eyebrow,
  title,
  intro,
  highlights = [],
  sections = [],
  relatedLinks = [],
  cta,
}) => {
  return (
    <div className="bg-[#f7f9fc] py-16">
      <div className="container mx-auto max-w-6xl px-4">
        <section className="overflow-hidden rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">{intro}</p>

          {relatedLinks.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-white hover:text-brand-dark"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </section>

        {highlights.length > 0 && (
          <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map(({ icon: Icon, title: cardTitle, body }) => (
              <article
                key={cardTitle}
                className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                  <Icon size={20} />
                </div>
                <h2 className="mt-4 font-serif text-2xl font-bold text-brand-dark">{cardTitle}</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">{body}</p>
              </article>
            ))}
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div className="rounded-[32px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
            <div className="space-y-8">
              {sections.map((section) => (
                <article
                  key={section.title}
                  className="border-b border-brand-accent/10 pb-8 last:border-b-0 last:pb-0"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">
                    {section.eyebrow || eyebrow}
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-brand-dark">{section.title}</h2>
                  {section.body && (
                    <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">{section.body}</p>
                  )}
                  {section.points?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {section.points.map((point) => (
                        <div
                          key={point}
                          className="rounded-2xl border border-gray-100 bg-[#fafbfd] px-4 py-3 text-sm leading-7 text-gray-600"
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">Need more help?</p>
              <h2 className="mt-3 font-serif text-2xl font-bold text-brand-dark">Speak with the Apex Link Group team</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                If you need clarity on shipping, returns, privacy, or wholesale support, our team is happy to help.
              </p>
              <div className="mt-5 space-y-3">
                <Link
                  to="/contact"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
                >
                  Contact Support <ArrowRight size={16} className="ml-2" />
                </Link>
                <Link
                  to="/track-order"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-brand-primary/20 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  Track an Order
                </Link>
              </div>
            </div>

            {cta && (
              <div className="rounded-[28px] border border-brand-accent/20 bg-[#f5f8fc] p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">{cta.eyebrow}</p>
                <h2 className="mt-3 font-serif text-2xl font-bold text-brand-dark">{cta.title}</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">{cta.body}</p>
                {cta.to && cta.label && (
                  <Link
                    to={cta.to}
                    className="mt-5 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary shadow-sm transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                  >
                    {cta.label}
                  </Link>
                )}
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
};

export default PolicyPageLayout;
