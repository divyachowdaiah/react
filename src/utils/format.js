/** Turn "Tom &amp; Jerry &#8211; Mug" into plain text. */
export function decodeHtml(value = '') {
  if (!value || !/[&<]/.test(value)) return value || '';
  const el = document.createElement('textarea');
  el.innerHTML = String(value);
  return el.value;
}

/** Remove tags and decode entities (for excerpts, meta text, etc.). */
export function plainText(html = '') {
  return decodeHtml(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Format a Store API price.
 * The Store API sends prices as strings in the smallest currency unit
 * (e.g. "129900" with currency_minor_unit 2 = 1,299.00) together with the
 * store's currency settings, so we never hard-code a currency.
 */
export function formatMoney(amount, currency = {}) {
  if (amount === undefined || amount === null || amount === '') return '';
  const minor = Number(currency.currency_minor_unit ?? 2);
  const value = Number(amount) / 10 ** minor;
  if (Number.isNaN(value)) return '';

  const fixed = Math.abs(value).toFixed(minor);
  let [whole, decimals] = fixed.split('.');
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, currency.currency_thousand_separator ?? ',');
  const number = decimals ? `${whole}${currency.currency_decimal_separator ?? '.'}${decimals}` : whole;

  const prefix = decodeHtml(currency.currency_prefix ?? currency.currency_symbol ?? '');
  const suffix = decodeHtml(currency.currency_suffix ?? '');
  return `${value < 0 ? '-' : ''}${prefix}${number}${suffix}`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Do the cart's displayed unit prices include tax?
 * (Depends on the store's "Display prices" tax setting.)
 */
export function pricesIncludeTax(cart) {
  const items = cart?.items || [];
  if (!items.length || !cart.totals) return false;
  const shown = items.reduce((sum, item) => sum + Number(item.prices?.price) * item.quantity, 0);
  if (Number.isNaN(shown)) return false;
  const excl = Number(cart.totals.total_items);
  const incl = excl + Number(cart.totals.total_items_tax || 0);
  return Math.abs(shown - incl) < Math.abs(shown - excl);
}

/** Friendly names for common payment gateway IDs (used if the helper plugin is not installed). */
const GATEWAY_LABELS = {
  cod: 'Cash on delivery',
  bacs: 'Direct bank transfer',
  cheque: 'Check payments',
  paypal: 'PayPal',
  stripe: 'Credit / debit card (Stripe)',
  razorpay: 'Razorpay (UPI, cards, netbanking)',
  payu: 'PayU',
  cashfree: 'Cashfree',
  ppcp: 'PayPal',
};

export function gatewayLabel(id) {
  if (GATEWAY_LABELS[id]) return GATEWAY_LABELS[id];
  return id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
