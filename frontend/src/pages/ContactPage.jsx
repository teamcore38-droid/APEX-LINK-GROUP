import { useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, Mail, MapPin, MessageSquareText, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const createInitialForm = (userInfo) => ({
  name: userInfo?.name || '',
  email: userInfo?.email || '',
  phone: userInfo?.phone || '',
  subject: '',
  message: '',
});

const ContactPage = () => {
  const { userInfo } = useAuth();

  const [formData, setFormData] = useState(() => createInitialForm(userInfo));
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const contactCards = useMemo(
    () => [
      {
        icon: MapPin,
        title: 'Studio & Dispatch',
        body: '580/12, Moque Lane\nNawala, Rajagiriya\nSri Lanka',
      },
      {
        icon: Phone,
        title: 'Customer Care',
        body: '+94 76 566 9961\nMonday to Saturday\n9:00 AM - 6:00 PM IST',
      },
      {
        icon: Mail,
        title: 'Email Support',
        body: 'info@apexspices.lk',
      },
    ],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setError('');
    setSuccessMessage('');
    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const submitHandler = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const nextErrors = {};
    if (!formData.name.trim()) {
      nextErrors.name = 'This field is required';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'This field is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      nextErrors.subject = 'This field is required';
    }

    if (!formData.message.trim()) {
      nextErrors.message = 'This field is required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const { data } = await axios.post('/api/contact', formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSuccessMessage(
        data.message || 'Thank you for reaching out. Our team will reply shortly.'
      );
      setFormData(createInitialForm(userInfo));
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError.response?.data?.message ||
          'We could not send your message right now. Please try again shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff7ee] pt-2 sm:pt-4 pb-12">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4">
        <section className="rounded-2xl bg-brand-dark px-5 py-4 text-white shadow-lg sm:px-8 sm:py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-accent sm:text-xs">Contact Us</p>
          <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">Let’s make your next order effortless</h1>
        </section>

        <div className="mt-4 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Customer Care</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">How we can help</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Use the form for order issues, shipping questions, gifting requests, and wholesale conversations. If your request is time-sensitive, include your order number in the message.
              </p>
            </div>

            <div className="grid gap-5">
              {contactCards.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-bold text-brand-dark">{title}</h3>
                  <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">{body}</div>
                </article>
              ))}
            </div>
          </aside>

          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)] sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                <MessageSquareText size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Send a Message</p>
                <h2 className="font-serif text-3xl font-bold text-brand-dark">Tell us what you need</h2>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {successMessage}
              </div>
            )}

            <form noValidate className="mt-6 space-y-5" onSubmit={submitHandler}>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-2 block text-sm font-semibold text-brand-dark">Your Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition ${
                      fieldErrors.name ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition ${
                      fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <label htmlFor="contact-phone" className="mb-2 block text-sm font-semibold text-brand-dark">Phone Number</label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="text"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-2 block text-sm font-semibold text-brand-dark">Subject</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition ${
                      fieldErrors.subject ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                    }`}
                    placeholder="Order support, wholesale, gifting, product question..."
                  />
                  {fieldErrors.subject && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.subject}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold text-brand-dark">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="7"
                  value={formData.message}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-[#fff7ee] px-4 py-3 text-sm leading-7 text-brand-dark outline-none transition ${
                    fieldErrors.message ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-accent'
                  }`}
                  placeholder="Tell us about your question, order number, or what kind of help you need."
                />
                {fieldErrors.message && (
                  <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.message}</p>
                )}
              </div>

              <div className="rounded-[24px] border border-brand-accent/15 bg-[#fbf3ea] px-5 py-4 text-sm leading-7 text-gray-600">
                We review every message manually. For the fastest order support, include your order ID and the email address used during checkout.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" /> Sending Message...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 sm:p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00d757] text-white shadow-sm">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-brand-dark sm:text-lg">Prefer to chat with us?</h3>
                  <p className="text-xs text-gray-600 sm:text-sm">Contact our Customer Care team on WhatsApp for quick assistance.</p>
                </div>
              </div>

              <a
                href="https://wa.me/94765669961"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#00d757] hover:bg-[#00c04d] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all duration-200 hover:shadow-md shrink-0"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
