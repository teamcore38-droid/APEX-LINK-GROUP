import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_EVENT, trackPageView } from '../utils/analytics';

const AnalyticsRouteTracker = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const recordPageView = () => trackPageView(`${pathname}${search}`);
    recordPageView();
    window.addEventListener(CONSENT_EVENT, recordPageView);

    return () => window.removeEventListener(CONSENT_EVENT, recordPageView);
  }, [pathname, search]);

  return null;
};

export default AnalyticsRouteTracker;
