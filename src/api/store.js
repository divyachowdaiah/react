import { request, ApiError } from './http';

/**
 * WooCommerce Store API wrapper  (/wp-json/wc/store/v1)
 * Public API: no keys or secrets are used anywhere in this project.
 */
const S = '/wc/store/v1';

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export async function getProducts(params = {}) {
  const { data, headers } = await request(`${S}/products`, { params });
  const perPage = Number(params.per_page) || 10;
  const page = Number(params.page) || 1;
  const list = Array.isArray(data) ? data : [];

  const headerTotal = headers.get('X-WP-Total');
  const headerPages = headers.get('X-WP-TotalPages');

  return {
    products: list,
    total: headerTotal ? Number(headerTotal) : list.length,
    // If the CORS config hides the pagination headers, fall back to a safe guess.
    totalPages: headerPages ? Number(headerPages) : list.length < perPage ? page : page + 1,
  };
}

export async function getProductBySlug(slug) {
  const { data } = await request(`${S}/products`, { params: { slug } });
  if (Array.isArray(data) && data[0]) return data[0];

  if (/^\d+$/.test(slug)) {
    const res = await request(`${S}/products/${slug}`);
    return res.data;
  }
  throw new ApiError('This product could not be found.', 404, 'not_found');
}

/**
 * Variable products only list variation IDs + attributes. This loads the
 * full variation data (price, stock, image) for each one.
 */
export async function getVariations(product) {
  const list = product.variations || [];
  if (!list.length) return [];

  const byId = new Map();
  try {
    const { data } = await request(`${S}/products`, {
      params: { type: 'variation', parent: product.id, per_page: 100 },
    });
    (Array.isArray(data) ? data : []).forEach((v) => byId.set(v.id, v));
  } catch {
    /* fall through to one-by-one loading */
  }

  const missing = list.filter((v) => !byId.has(v.id));
  const loaded = await Promise.all(
    missing.map((v) =>
      request(`${S}/products/${v.id}`)
        .then((r) => r.data)
        .catch(() => null)
    )
  );
  loaded.forEach((v) => v && byId.set(v.id, v));

  return list
    .map((v) => ({ id: v.id, attributes: v.attributes || [], product: byId.get(v.id) || null }))
    .filter((v) => v.product);
}

export async function getCategories() {
  const { data } = await request(`${S}/products/categories`, {
    params: { per_page: 100, hide_empty: true },
  });
  return Array.isArray(data) ? data : [];
}

/* ------------------------------------------------------------------ */
/* Cart  (all calls return the complete, updated cart)                 */
/* ------------------------------------------------------------------ */

const cartCall = (path, body) =>
  request(`${S}/cart${path}`, { method: body === undefined ? 'GET' : 'POST', body, store: true }).then(
    (r) => r.data
  );

export const getCart = () => cartCall('');

export const addToCart = ({ id, quantity = 1, variation = [] }) =>
  cartCall('/add-item', { id, quantity, variation });

export const updateCartItem = (key, quantity) => cartCall('/update-item', { key, quantity });

export const removeCartItem = (key) => cartCall('/remove-item', { key });

export const applyCoupon = (code) => cartCall('/apply-coupon', { code });

export const removeCoupon = (code) => cartCall('/remove-coupon', { code });

export const selectShippingRate = (packageId, rateId) =>
  cartCall('/select-shipping-rate', { package_id: packageId, rate_id: rateId });

/** Sends the customer's address so WooCommerce can recalculate shipping + tax. */
export const updateCustomer = ({ billing_address, shipping_address }) =>
  cartCall('/update-customer', { billing_address, shipping_address });

/* ------------------------------------------------------------------ */
/* Checkout + orders                                                   */
/* ------------------------------------------------------------------ */

export async function placeOrder(payload) {
  const { data } = await request(`${S}/checkout`, { method: 'POST', body: payload, store: true });
  return data;
}

export async function getOrder(id, key, billingEmail) {
  const { data } = await request(`${S}/order/${id}`, {
    params: { key, billing_email: billingEmail },
    store: true,
  });
  return data;
}
