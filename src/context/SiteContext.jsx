import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getHelperConfig, getSiteInfo } from '../api/wp';
import { DEFAULT_COUNTRY } from '../config';

const SiteContext = createContext(null);

/**
 * Loads general information about the WordPress site (name, tagline, logo)
 * and, if the optional helper plugin is installed, payment method titles and
 * country / state lists for the checkout form.
 */
export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [helper, setHelper] = useState(null);
  const [siteError, setSiteError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSiteInfo()
      .then((info) => !cancelled && setSite(info))
      .catch((err) => !cancelled && setSiteError(err));
    getHelperConfig().then((cfg) => !cancelled && setHelper(cfg));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      site,
      siteError,
      helper,
      defaultCountry: helper?.default_country || DEFAULT_COUNTRY,
    }),
    [site, siteError, helper]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}
