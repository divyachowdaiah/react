import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getOrder } from '../api/store';
import { useSite } from '../context/SiteContext';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml, formatMoney, gatewayLabel, pricesIncludeTax } from '../utils/format';
import CartTotals from '../components/CartTotals';
import PageHeader from '../components/PageHeader';
import ProductImage from '../components/ProductImage';
import { ErrorMessage, Spinner } from '../components/Feedback';
import { CheckIcon } from '../components/Icons';

/** What we stored in this browser when the order was placed. */
function readSaved(id) {
  try {
    return JSON.parse(sessionStorage.getItem(`wcs_order_${id}`) || 'null');
  } catch {
    return null;
  }
}

/** Plain-English status + payment status for a WooCommerce order status. */
function describeStatus(status, paymentId) {
  const cod = paymentId === 'cod';
  switch (status) {
    case 'processing':
      return {
        tone: 'success',
        headline: 'Thank you! Your order has been received.',
        payment: cod ? 'Pay on delivery' : 'Paid',
        text: 'We are now processing your order.',
      };
    case 'completed':
      return { tone: 'success', headline: 'Your order is complete.', payment: 'Paid', text: 'Thank you for shopping with us.' };
    case 'on-hold':
      return {
        tone: 'warn',
        headline: 'Thank you! Your order is on hold.',
        payment: 'Awaiting payment confirmation',
        text: 'We will start processing as soon as your payment is confirmed. Please check your email for payment instructions.',
      };
    case 'pending':
    case 'checkout-draft':
      return {
        tone: 'warn',
        headline: 'Your order is waiting for payment.',
        payment: 'Payment pending',
        text: 'The order will be processed once payment is received.',
      };
    case 'failed':
      return { tone: 'error', headline: 'Payment failed.', payment: 'Payment failed', text: 'Your payment could not be completed. You can try again from your cart.' };
    case 'cancelled':
      return { tone: 'error', headline: 'This order was cancelled.', payment: 'Cancelled', text: '' };
    case 'refunded':
      return { tone: 'info', headline: 'This order was refunded.', payment: 'Refunded', text: '' };
    default:
      return { tone: 'info', headline: 'Order received.', payment: status ? status.replace(/-/g, ' ') : 'Unknown', text: '' };
  }
}

/** Combine the live order from WooCommerce with what we saved at checkout. */
function buildView(order, saved) {
  const o = order || {};
  const result = saved?.result || {};
  const snap = saved?.snapshot || {};
  const paymentId = o.payment_method || result.payment_method || '';

  return {
    live: Boolean(order),
    number: o.order_number || o.number || result.order_number || result.order_id || o.id,
    status: o.status || result.status || '',
    paymentId,
    paymentTitle: o.payment_method_title || (paymentId ? gatewayLabel(paymentId) : ''),
    items: (o.items?.length ? o.items : snap.items) || [],
    totals: o.totals || snap.totals || null,
    needsShipping: o.needs_shipping ?? snap.needs_shipping ?? false,
    billing: o.billing_address || result.billing_address || null,
    shipping: o.shipping_address || result.shipping_address || null,
    note: o.customer_note ?? result.customer_note ?? '',
  };
}

function Address({ title, address }) {
  if (!address) return null;
  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(' '),
    address.address_1,
    address.address_2,
    [address.city, address.state, address.postcode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);
  if (!lines.length) return null;

  return (
    <div>
      <h3>{title}</h3>
      <address>
        {lines.map((line, i) => (
          <span key={i}>
            {decodeHtml(line)}
            <br />
          </span>
        ))}
        {address.email && <span>{address.email}<br /></span>}
        {address.phone && <span>{address.phone}</span>}
      </address>
    </div>
  );
}

export default function OrderConfirmation() {
  usePageTitle('Order confirmation');
  const { id } = useParams();
  const [params] = useSearchParams();
  const { helper } = useSite();
  const key = params.get('key') || '';

  const [saved] = useState(() => readSaved(id));
  const [email] = useState(() => params.get('email') || saved?.email || '');

  // Return links from payment gateways may carry the e-mail address: remove it from the address bar.
  useEffect(() => {
    if (!params.has('email')) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('email');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, error, loading, reload } = useAsync(async () => {
    if (!key && !saved) {
      throw new Error('This link is missing the order key. Please use the link from your confirmation email.');
    }
    if (!key) return null;
    try {
      return await getOrder(id, key, email);
    } catch (err) {
      if (saved) return null; // show what we saved at checkout instead
      throw err;
    }
  }, [id, key]);

  if (error) {
    return (
      <>
        <PageHeader title="Order confirmation" />
        <div className="container section">
          <ErrorMessage error={error} onRetry={reload} title="We couldn’t load this order" />
        </div>
      </>
    );
  }

  if (loading && data === null && !saved) {
    return (
      <>
        <PageHeader title="Order confirmation" />
        <div className="container section">
          <Spinner label="Loading your order…" />
        </div>
      </>
    );
  }

  const view = buildView(data, saved);
  const info = describeStatus(view.status, view.paymentId);
  const gatewayText = helper?.gateways?.find((g) => g.id === view.paymentId)?.description;
  const incl = pricesIncludeTax({ items: view.items, totals: view.totals });

  return (
    <>
      <PageHeader title="Order confirmation" />

      <div className="container confirmation">
        <div className={`status-banner status-${info.tone}`}>
          <span className="status-icon">
            <CheckIcon width={26} height={26} />
          </span>
          <div>
            <h2>{info.headline}</h2>
            {info.text && <p>{info.text}</p>}
          </div>
        </div>

        <div className="card">
          <dl className="order-facts">
            <div>
              <dt>Order number</dt>
              <dd>#{view.number}</dd>
            </div>
            <div>
              <dt>Order status</dt>
              <dd className="cap">{view.status ? view.status.replace(/-/g, ' ') : '—'}</dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>{info.payment}</dd>
            </div>
            {view.paymentTitle && (
              <div>
                <dt>Payment method</dt>
                <dd>{decodeHtml(view.paymentTitle)}</dd>
              </div>
            )}
            {view.totals && (
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(view.totals.total_price, view.totals)}</dd>
              </div>
            )}
          </dl>
          {!view.live && (
            <p className="muted small">Showing the details saved when you placed the order. Live status is currently unavailable.</p>
          )}
          {gatewayText && (view.status === 'on-hold' || view.status === 'pending') && (
            <p className="muted small">{decodeHtml(gatewayText.replace(/<[^>]*>/g, ' '))}</p>
          )}
        </div>

        {view.items.length > 0 && (
          <div className="card">
            <h2>Order details</h2>
            <ul className="summary-items">
              {view.items.map((item, i) => (
                <li key={item.key || i}>
                  <span className="summary-thumb">
                    <ProductImage image={item.images?.[0]} alt="" sizes="64px" />
                    <span className="summary-qty">{item.quantity}</span>
                  </span>
                  <span className="summary-name">
                    {decodeHtml(item.name)}
                    {item.variation?.length > 0 && (
                      <small className="muted">{item.variation.map((v) => decodeHtml(v.value)).join(' / ')}</small>
                    )}
                  </span>
                  {item.totals && (
                    <strong>
                      {formatMoney(
                        Number(item.totals.line_subtotal ?? item.totals.line_total) +
                          (incl ? Number(item.totals.line_subtotal_tax ?? item.totals.line_total_tax ?? 0) : 0),
                        item.totals
                      )}
                    </strong>
                  )}
                </li>
              ))}
            </ul>
            <CartTotals cart={{ items: view.items, totals: view.totals, needs_shipping: view.needsShipping }} />
          </div>
        )}

        <div className="card address-grid">
          <Address title="Billing address" address={view.billing} />
          {view.needsShipping && <Address title="Shipping address" address={view.shipping} />}
          {view.note && (
            <div>
              <h3>Order notes</h3>
              <p>{view.note}</p>
            </div>
          )}
        </div>

        <div className="confirmation-actions">
          {info.tone === 'error' && (
            <Link to="/cart" className="btn btn-outline btn-lg">
              Back to cart
            </Link>
          )}
          <Link to="/shop" className="btn btn-primary btn-lg">
            Continue shopping
          </Link>
        </div>
      </div>
    </>
  );
}
