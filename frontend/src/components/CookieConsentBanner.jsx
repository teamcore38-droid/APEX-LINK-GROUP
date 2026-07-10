import { useMemo, useState } from 'react';
import axios from 'axios';
import { Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const getSessionId = () => {
  const key = 'apexConsentSessionId';
  const existing = localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(key, next);
  return next;
};

const CONSENT_KEY = 'apexCookieConsent';

const CookieConsentBanner = () => {
  const { userInfo } = useAuth();
  const [visible, setVisible] = useState(() => !localStorage.getItem(CONSENT_KEY));
  const [expanded, setExpanded] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: false,
    marketing: false,
    personalization: false,
  });
  const sessionId = useMemo(() => getSessionId(), []);

  const saveConsent = async (nextPreferences) => {
    const payload = {
      consentVersion: '2026-07-09',
      sessionId,
      ...nextPreferences,
    };

    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    setVisible(false);

    try {
      await axios.post('/api/privacy/consent', payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-gray-200 bg-white shadow-[0_-14px_40px_rgba(8,23,41,0.16)]">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="flex items-center text-sm font-bold uppercase tracking-[0.18em] text-brand-dark">
            <ShieldCheck size={18} className="mr-2 text-brand-accent" /> Privacy Preferences
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Necessary cookies keep checkout and security working. You can choose analytics, marketing, and personalization preferences.
          </p>
          {expanded && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ['analytics', 'Analytics'],
                ['marketing', 'Marketing'],
                ['personalization', 'Personalization'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-dark">
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center rounded-md border border-gray-200 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-dark"
          >
            <Settings size={15} className="mr-2" /> Customize
          </button>
          <button
            type="button"
            onClick={() => saveConsent({ analytics: false, marketing: false, personalization: false })}
            className="rounded-md border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary"
          >
            Necessary Only
          </button>
          <button
            type="button"
            onClick={() => saveConsent(expanded ? preferences : { analytics: true, marketing: true, personalization: true })}
            className="rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white"
          >
            {expanded ? 'Save Choices' : 'Accept All'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
