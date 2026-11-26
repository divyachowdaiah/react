import { useEffect } from 'react';
import { useSite } from '../context/SiteContext';

/** Sets the browser tab title, e.g. "Shop · My Store". */
export function usePageTitle(title) {
  const { site } = useSite();
  useEffect(() => {
    const name = site?.name || 'Store';
    document.title = title ? `${title} · ${name}` : name;
  }, [title, site?.name]);
}
