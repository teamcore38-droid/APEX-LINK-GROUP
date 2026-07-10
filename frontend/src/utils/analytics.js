import axios from 'axios';

const SESSION_KEY = 'apexMarketingSessionId';

const getMarketingSessionId = () => {
  const existing = localStorage.getItem(SESSION_KEY);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(SESSION_KEY, next);
  return next;
};

const loadScript = (id, src, body) => {
  if (document.getElementById(id)) {
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  if (src) script.src = src;
  if (body) script.textContent = body;
  document.head.appendChild(script);
};

const installAdTracking = () => {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const metaPixelId = import.meta.env.VITE_META_PIXEL_ID;
  const tiktokPixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;
  const linkedinPartnerId = import.meta.env.VITE_LINKEDIN_PARTNER_ID;

  if (gaId) {
    loadScript('ga4-loader', `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }

  if (metaPixelId) {
    window.fbq = window.fbq || function fbq() { (window.fbq.queue = window.fbq.queue || []).push(arguments); };
    loadScript('meta-pixel-loader', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
  }

  if (tiktokPixelId) {
    loadScript('tiktok-pixel-loader', 'https://analytics.tiktok.com/i18n/pixel/events.js');
    window.ttq = window.ttq || { track: () => {}, page: () => {}, load: () => {} };
    window.ttq.load?.(tiktokPixelId);
    window.ttq.page?.();
  }

  if (linkedinPartnerId) {
    window._linkedin_partner_id = linkedinPartnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(linkedinPartnerId);
    loadScript('linkedin-insight-loader', 'https://snap.licdn.com/li.lms-analytics/insight.min.js');
  }
};

const trackAdPlatforms = (eventName, properties = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }

  if (window.fbq) {
    const metaMap = {
      product_view: 'ViewContent',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      purchase: 'Purchase',
    };
    window.fbq('track', metaMap[eventName] || eventName, properties);
  }

  if (window.ttq?.track) {
    window.ttq.track(eventName, properties);
  }
};

const trackEvent = async (eventName, properties = {}, options = {}) => {
  const payload = {
    eventName,
    sessionId: getMarketingSessionId(),
    anonymousId: getMarketingSessionId(),
    source: 'web',
    path: window.location.pathname,
    referrer: document.referrer,
    properties,
  };

  trackAdPlatforms(eventName, properties);

  try {
    await axios.post('/api/analytics/events', payload, {
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        'x-session-id': payload.sessionId,
      },
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[analytics]', error);
    }
  }
};

export {
  getMarketingSessionId,
  installAdTracking,
  trackEvent,
};
