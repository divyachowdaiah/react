// Central place for all environment-driven settings.
const clean = (value = '') => String(value).trim().replace(/\/+$/, '');

/** Your WordPress site, e.g. https://example.com */
export const WP_URL = clean(import.meta.env.VITE_WP_URL);

/**
 * Where API calls are sent.
 * - Development: '' (same origin) because Vite proxies /wp-json to WP_URL.
 * - Production: the WordPress URL (or same origin if VITE_WP_URL is empty).
 * - VITE_API_PROXY=true (Vercel): same origin; vercel.json forwards /wp-json to WordPress,
 *   so the browser never makes a cross-origin call and CORS is not needed.
 */
export const API_ORIGIN =
  import.meta.env.DEV || import.meta.env.VITE_API_PROXY === 'true' ? '' : WP_URL;

/** Slugs of the WordPress pages used for About / Services / Contact. */
export const PAGE_SLUGS = {
  about: import.meta.env.VITE_PAGE_ABOUT || 'about',
  services: import.meta.env.VITE_PAGE_SERVICES || 'services',
  contact: import.meta.env.VITE_PAGE_CONTACT || 'contact',
};

export const DEFAULT_COUNTRY = (import.meta.env.VITE_DEFAULT_COUNTRY || 'IN').toUpperCase();
export const CF7_FORM_ID = (import.meta.env.VITE_CF7_FORM_ID || '').trim();
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL || '').trim();

export const PRODUCTS_PER_PAGE = 12;
export const POSTS_PER_PAGE = 9;

/** True in dev when the .env file is missing the WordPress URL. */
export const MISSING_WP_URL = import.meta.env.DEV && !WP_URL;
