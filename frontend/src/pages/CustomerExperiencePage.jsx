import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell, Gift, Loader2, MessageCircle, PackageX, Sparkles } from 'lucide-react';
import Product from '../components/Product';
import { useAuth } from '../context/AuthContext';

const getCustomerSessionId = () => {
  const key = 'apexCustomerSessionId';
  const existing = localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(key, next);
  return next;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const CustomerExperiencePage = () => {
  const { userInfo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [preferences, setPreferences] = useState({
    email: { orderUpdates: true, promotions: false, support: true },
    sms: { enabled: false, phone: '', orderUpdates: false },
    whatsapp: { enabled: false, phone: '', orderUpdates: false },
  });
  const [tickets, setTickets] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    name: userInfo?.name || '',
    guestEmail: userInfo?.email || '',
    subject: '',
    category: 'General',
    channel: 'Support Ticket',
    message: '',
  });
  const [cancelForm, setCancelForm] = useState({
    orderId: '',
    email: userInfo?.email || '',
    guestAccessToken: '',
    reason: '',
  });
  const [savingKey, setSavingKey] = useState('');

  const sessionId = useMemo(() => getCustomerSessionId(), []);
  const config = useMemo(
    () => ({
      headers: {
        ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      params: {
        sessionId,
      },
    }),
    [sessionId, userInfo]
  );

  const loadExperience = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const requests = [
        axios.get('/api/customer/recently-viewed', config).then(({ data }) => setRecentlyViewed(data)),
        axios.get('/api/customer/recommendations', config).then(({ data }) => setRecommendations(data)),
      ];

      if (userInfo?.token) {
        requests.push(axios.get('/api/customer/loyalty', config).then(({ data }) => setLoyalty(data)));
        requests.push(axios.get('/api/customer/notification-preferences', config).then(({ data }) => setPreferences((current) => ({ ...current, ...data }))));
        requests.push(axios.get('/api/customer/support-tickets', config).then(({ data }) => setTickets(data)));
      } else if (ticketForm.guestEmail) {
        requests.push(
          axios.get('/api/customer/support-tickets', {
            ...config,
            params: { sessionId, guestEmail: ticketForm.guestEmail },
          }).then(({ data }) => setTickets(data))
        );
      }

      await Promise.all(requests);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load customer experience tools.');
    } finally {
      setLoading(false);
    }
  }, [config, sessionId, ticketForm.guestEmail, userInfo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExperience();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadExperience]);

  const runAction = async (key, action, successMessage) => {
    setSavingKey(key);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadExperience();
    } catch (actionError) {
      console.error(actionError);
      setError(actionError.response?.data?.message || actionError.message || 'Action failed.');
    } finally {
      setSavingKey('');
    }
  };

  const savePreferences = () =>
    runAction(
      'preferences',
      () => axios.put('/api/customer/notification-preferences', preferences, config),
      'Notification preferences saved.'
    );

  const enableWebPush = () =>
    runAction(
      'push',
      async () => {
        if (!('Notification' in window)) {
          throw new Error('Browser notifications are not supported on this device.');
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission was not granted.');
        }

        const { data: mobileConfig } = await axios.get('/api/v1/mobile/config');
        let payload = {
          platform: 'web',
          token: `web-notification-${sessionId}`,
          deviceId: sessionId,
          appVersion: 'pwa',
          guestEmail: userInfo?.email || ticketForm.guestEmail,
          sessionId,
          preferences: {
            orderUpdates: true,
            promotions: false,
            support: true,
          },
        };

        if ('serviceWorker' in navigator && 'PushManager' in window && mobileConfig.push?.webPushPublicKey) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(mobileConfig.push.webPushPublicKey),
          });
          const subscriptionPayload = subscription.toJSON();
          payload = {
            ...payload,
            endpoint: subscription.endpoint,
            keys: subscriptionPayload.keys || {},
          };
        }

        await axios.post('/api/v1/mobile/push-subscriptions', payload, config);
      },
      'Web push preference saved.'
    );

  const submitTicket = () =>
    runAction(
      'ticket',
      () => axios.post('/api/customer/support-tickets', ticketForm, config),
      'Support ticket created.'
    );

  const requestCancellation = () =>
    runAction(
      'cancellation',
      () =>
        axios.post(
          `/api/orders/${cancelForm.orderId}/cancellation-requests`,
          {
            reason: cancelForm.reason,
            email: cancelForm.email,
            guestAccessToken: cancelForm.guestAccessToken,
          },
          config
        ),
      'Cancellation request submitted.'
    );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="rounded-lg bg-brand-dark px-6 py-10 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-accent">Customer Experience</p>
          <h1 className="mt-3 font-serif text-4xl font-bold">Rewards, Support, Preferences, Recommendations</h1>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center font-serif text-2xl font-bold text-brand-dark">
              <Gift className="mr-2 text-brand-accent" /> Loyalty & Rewards
            </h2>
            {userInfo ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Points</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-brand-dark">{loyalty?.account?.pointsBalance || 0}</p>
                </div>
                <div className="rounded-xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Tier</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-brand-dark">{loyalty?.account?.tier || 'Bronze'}</p>
                </div>
                <div className="rounded-xl bg-brand-light p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Lifetime</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-brand-dark">{loyalty?.account?.lifetimePoints || 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sign in to earn and view loyalty points.</p>
            )}
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center font-serif text-2xl font-bold text-brand-dark">
              <Bell className="mr-2 text-brand-accent" /> Notification Preferences
            </h2>
            {userInfo ? (
              <div className="grid gap-3">
                {[
                  ['email', 'Email'],
                  ['sms', 'SMS'],
                  ['whatsapp', 'WhatsApp'],
                ].map(([channel, label]) => (
                  <div key={channel} className="rounded-xl border border-gray-100 p-4">
                    <label className="flex items-center gap-3 text-sm font-semibold text-brand-dark">
                      <input
                        type="checkbox"
                        checked={channel === 'email' ? preferences.email.orderUpdates : preferences[channel].enabled}
                        onChange={(event) =>
                          setPreferences((current) => ({
                            ...current,
                            [channel]: {
                              ...current[channel],
                              ...(channel === 'email'
                                ? { orderUpdates: event.target.checked }
                                : { enabled: event.target.checked, orderUpdates: event.target.checked }),
                            },
                          }))
                        }
                      />
                      {label} order updates
                    </label>
                    {channel !== 'email' && (
                      <input
                        value={preferences[channel].phone || ''}
                        onChange={(event) =>
                          setPreferences((current) => ({
                            ...current,
                            [channel]: { ...current[channel], phone: event.target.value },
                          }))
                        }
                        placeholder={`${label} phone`}
                        className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                      />
                    )}
                  </div>
                ))}
                <button type="button" onClick={savePreferences} className="self-start rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                  Save Preferences
                </button>
                <button
                  type="button"
                  onClick={enableWebPush}
                  className="self-start rounded-md border border-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary"
                >
                  Enable Web Push
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sign in to manage notification preferences.</p>
            )}
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center font-serif text-2xl font-bold text-brand-dark">
              <MessageCircle className="mr-2 text-brand-accent" /> Live Chat / Support Tickets
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={ticketForm.name} onChange={(event) => setTicketForm((form) => ({ ...form, name: event.target.value }))} placeholder="Name" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <input value={ticketForm.guestEmail} onChange={(event) => setTicketForm((form) => ({ ...form, guestEmail: event.target.value }))} placeholder="Email" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <input value={ticketForm.subject} onChange={(event) => setTicketForm((form) => ({ ...form, subject: event.target.value }))} placeholder="Subject" className="md:col-span-2 rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <select value={ticketForm.channel} onChange={(event) => setTicketForm((form) => ({ ...form, channel: event.target.value }))} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
                {['Support Ticket', 'Live Chat', 'Email', 'WhatsApp'].map((channel) => <option key={channel}>{channel}</option>)}
              </select>
              <select value={ticketForm.category} onChange={(event) => setTicketForm((form) => ({ ...form, category: event.target.value }))} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
                {['General', 'Order', 'Shipping', 'Return', 'Product', 'Payment', 'B2B'].map((category) => <option key={category}>{category}</option>)}
              </select>
              <textarea value={ticketForm.message} onChange={(event) => setTicketForm((form) => ({ ...form, message: event.target.value }))} placeholder="How can we help?" rows={4} className="md:col-span-2 rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <button type="button" onClick={submitTicket} className="mt-4 rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
              {savingKey === 'ticket' ? 'Sending...' : 'Create Ticket'}
            </button>
            <div className="mt-5 space-y-2">
              {tickets.slice(0, 5).map((ticket) => (
                <div key={ticket._id} className="rounded-xl bg-brand-light p-3 text-sm">
                  <p className="font-semibold text-brand-dark">{ticket.subject} - {ticket.status}</p>
                  <p className="text-gray-500">{ticket.category} via {ticket.channel}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center font-serif text-2xl font-bold text-brand-dark">
              <PackageX className="mr-2 text-brand-accent" /> Order Cancellation Request
            </h2>
            <div className="grid gap-3">
              <input value={cancelForm.orderId} onChange={(event) => setCancelForm((form) => ({ ...form, orderId: event.target.value }))} placeholder="Order ID" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <input value={cancelForm.email} onChange={(event) => setCancelForm((form) => ({ ...form, email: event.target.value }))} placeholder="Email for guest orders" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <input value={cancelForm.guestAccessToken} onChange={(event) => setCancelForm((form) => ({ ...form, guestAccessToken: event.target.value }))} placeholder="Guest access token, if applicable" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <textarea value={cancelForm.reason} onChange={(event) => setCancelForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Reason" rows={4} className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <button type="button" onClick={requestCancellation} className="mt-4 rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
              Submit Cancellation Request
            </button>
          </section>
        </div>

        {recentlyViewed.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-5 flex items-center font-serif text-2xl font-bold text-brand-dark">
              <Sparkles className="mr-2 text-brand-accent" /> Recently Viewed
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentlyViewed.slice(0, 4).map((product) => <Product key={product._id} product={product} />)}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-5 font-serif text-2xl font-bold text-brand-dark">Recommended For You</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.slice(0, 4).map((product) => <Product key={product._id} product={product} />)}
            </div>
          </section>
        )}

        <div className="mt-10 text-center">
          <Link to="/products" className="text-sm font-bold uppercase tracking-[0.18em] text-brand-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerExperiencePage;
