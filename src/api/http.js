import { API_ORIGIN } from '../config';

/**
 * Tiny fetch wrapper used by every API call.
 *
 * Cart session persistence:
 *   The WooCommerce Store API returns a `Cart-Token` (identifies the cart) and a
 *   `Nonce` header on cart responses. We keep both in localStorage and send them
 *   back on every cart/checkout request, so the cart survives page reloads and
 *   works across domains without cookies.
 */

const TOKEN_KEY = 'wcs_cart_token';
const NONCE_KEY = 'wcs_nonce';

const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value) window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable (private mode) - cart will last for this tab only */
    }
  },
};

// Used when localStorage is blocked.
const memory = { token: null, nonce: null };

const getToken = () => storage.get(TOKEN_KEY) || memory.token;
const getNonce = () => storage.get(NONCE_KEY) || memory.nonce;
const setToken = (v) => {
  memory.token = v;
  storage.set(TOKEN_KEY, v);
};
const setNonce = (v) => {
  memory.nonce = v;
  storage.set(NONCE_KEY, v);
};

export function clearCartSession() {
  setToken(null);
  setNonce(null);
}

export class ApiError extends Error {
  constructor(message, status = 0, code = '', data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const stripTags = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();

function buildUrl(path, params) {
  const url = new URL(`${API_ORIGIN}/wp-json${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    });
  }
  return url.toString();
}

async function readBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Cart writes must run one after another, otherwise WooCommerce can overwrite
// a previous change (each request loads and saves the whole session).
let writeQueue = Promise.resolve();
const enqueue = (task) => {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
};

async function send(path, { method, body, params, store, retry }) {
  const headers = { Accept: 'application/json' };

  if (store) {
    const token = getToken();
    const nonce = getNonce();
    if (token) headers['Cart-Token'] = token;
    if (nonce) headers.Nonce = nonce;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(
      'Could not reach the store. Check your internet connection or the WordPress URL / CORS settings.',
      0,
      'network_error'
    );
  }

  if (store) {
    const token = res.headers.get('Cart-Token');
    const nonce = res.headers.get('Nonce') || res.headers.get('X-WC-Store-API-Nonce');
    if (token) setToken(token);
    if (nonce) setNonce(nonce);
  }

  const data = await readBody(res);

  if (!res.ok) {
    const code = (data && data.code) || '';

    // Expired nonce / token: refresh the session once and try again.
    if (store && retry && (res.status === 401 || res.status === 403) && /nonce|token/i.test(code)) {
      if (/token/i.test(code)) clearCartSession();
      else setNonce(null);
      await send('/wc/store/v1/cart', { method: 'GET', store: true, retry: false });
      return send(path, { method, body, params, store, retry: false });
    }

    const message =
      (data && typeof data === 'object' && stripTags(data.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, code, data);
  }

  return { data, headers: res.headers };
}

/**
 * @param {string} path  e.g. "/wc/store/v1/products"
 * @param {object} opts  { method, body, params, store }
 *   store: true for cart / checkout calls (adds Cart-Token + Nonce headers)
 * @returns {Promise<{data:any, headers:Headers}>}
 */
export async function request(path, { method = 'GET', body, params, store = false } = {}) {
  const isWrite = method !== 'GET';

  const task = async () => {
    // Cart writes need a nonce. If we have none yet, fetch the cart first.
    if (store && isWrite && !getNonce()) {
      await send('/wc/store/v1/cart', { method: 'GET', store: true, retry: false });
    }
    return send(path, { method, body, params, store, retry: true });
  };

  return store && isWrite ? enqueue(task) : task();
}

/** Same as request() but for multipart/form-data (used by Contact Form 7). */
export async function postForm(path, formData) {
  let res;
  try {
    res = await fetch(buildUrl(path), { method: 'POST', body: formData, credentials: 'omit' });
  } catch {
    throw new ApiError('Could not reach the server. Please try again.', 0, 'network_error');
  }
  const data = await readBody(res);
  if (!res.ok) {
    throw new ApiError((data && data.message) || `Request failed (${res.status})`, res.status);
  }
  return data;
}
