import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { placeOrder } from '../api/store';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml, formatMoney, gatewayLabel, pricesIncludeTax } from '../utils/format';
import AddressFields, { Field, emptyAddress } from '../components/AddressFields';
import CartTotals from '../components/CartTotals';
import HtmlContent from '../components/HtmlContent';
import PageHeader from '../components/PageHeader';
import ProductImage from '../components/ProductImage';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADDRESS_KEYS = ['first_name', 'last_name', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country'];

const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));
const pickAddress = (obj) => Object.fromEntries(ADDRESS_KEYS.map((k) => [k, obj[k] ?? '']));

export default function Checkout() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const { cart, loading, error, busy, refresh, updateCustomer, selectShipping } = useCart();
  const { helper, defaultCountry } = useSite();

  const [contact, setContact] = useState({ email: '', phone: '' });
  const [billing, setBilling] = useState(emptyAddress(defaultCountry));
  const [shipDifferent, setShipDifferent] = useState(false);
  const [shipping, setShipping] = useState(emptyAddress(defaultCountry));
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [calc, setCalc] = useState({ loading: false, error: '' });
  const [prefilled, setPrefilled] = useState(false);
  const formRef = useRef(null);

  /* ---- Pre-fill from the customer data WooCommerce already has for this cart ---- */
  useEffect(() => {
    if (prefilled || !cart) return;
    const b = cart.billing_address || {};
    const s = cart.shipping_address || {};
    setBilling((cur) => ({ ...cur, ...compact(pickAddress(b)), country: b.country || cur.country }));
    setShipping((cur) => ({ ...cur, ...compact(pickAddress(s)), country: s.country || cur.country }));
    setContact((cur) => ({ email: b.email || cur.email, phone: b.phone || cur.phone }));
    setPrefilled(true);
  }, [cart, prefilled]);

  /* ---- Recalculate shipping + tax whenever the destination changes ---- */
  const destination = shipDifferent ? shipping : billing;
  const hasItems = Boolean(cart?.items?.length);
  useEffect(() => {
    if (!prefilled || !hasItems || !destination.country) return undefined;
    const timer = setTimeout(async () => {
      setCalc({ loading: true, error: '' });
      try {
        await updateCustomer({
          billing_address: compact({
            ...pickAddress(billing),
            email: EMAIL_RE.test(contact.email) ? contact.email : '',
          }),
          shipping_address: compact(pickAddress(destination)),
        });
        setCalc({ loading: false, error: '' });
      } catch (err) {
        setCalc({ loading: false, error: err.message });
      }
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prefilled,
    hasItems,
    shipDifferent,
    destination.country,
    destination.state,
    destination.city,
    destination.postcode,
    billing.country,
    billing.state,
    billing.postcode,
  ]);

  /* ---- Payment methods that WooCommerce says are available for this cart ---- */
  const needsPayment = cart?.needs_payment !== false;
  const methods = useMemo(() => {
    const ids = cart?.payment_methods?.length ? cart.payment_methods : helper?.gateways?.map((g) => g.id) || [];
    return ids.map((id) => {
      const info = helper?.gateways?.find((g) => g.id === id);
      return { id, title: info?.title || gatewayLabel(id), description: info?.description || '' };
    });
  }, [cart?.payment_methods, helper]);

  useEffect(() => {
    if (!needsPayment) return;
    if (!methods.some((m) => m.id === paymentMethod)) setPaymentMethod(methods[0]?.id || '');
  }, [methods, paymentMethod, needsPayment]);

  /* ---- Loading / empty states ---- */
  if (loading && !cart) {
    return (
      <>
        <PageHeader title="Checkout" />
        <div className="container section">
          <Spinner label="Loading checkout…" />
        </div>
      </>
    );
  }
  if (error && !cart) {
    return (
      <>
        <PageHeader title="Checkout" />
        <div className="container section">
          <ErrorMessage error={error} onRetry={refresh} title="Checkout could not be loaded" />
        </div>
      </>
    );
  }
  if (!hasItems) {
    return (
      <>
        <PageHeader title="Checkout" />
        <div className="container section">
          <EmptyState
            title="Your cart is empty"
            text="Add something to your cart before checking out."
            actionLabel="Browse products"
            actionTo="/shop"
          />
        </div>
      </>
    );
  }

  const incl = pricesIncludeTax(cart);
  const packages = cart.shipping_rates || [];
  // Rates can only exist once the customer has entered a destination.
  const addressReady = Boolean(destination.country && destination.postcode.trim());
  const noShippingRates =
    cart.needs_shipping && addressReady && packages.every((p) => !p.shipping_rates?.length);
  const noPaymentMethods = needsPayment && methods.length === 0;

  /* ---- Validation ---- */
  const validateAddress = (addr) => {
    const e = {};
    if (!addr.first_name.trim()) e.first_name = 'Required';
    if (!addr.last_name.trim()) e.last_name = 'Required';
    if (!addr.country) e.country = 'Required';
    if (!addr.address_1.trim()) e.address_1 = 'Required';
    if (!addr.city.trim()) e.city = 'Required';
    const states = helper?.states?.[addr.country];
    if (states && !helper.state_optional?.includes(addr.country) && !addr.state) e.state = 'Required';
    if (!helper?.postcode_optional?.includes(addr.country) && !addr.postcode.trim()) e.postcode = 'Required';
    return e;
  };

  const validate = () => {
    const e = {};
    if (!EMAIL_RE.test(contact.email)) e.email = 'Enter a valid email address';
    if (contact.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number';
    const b = validateAddress(billing);
    Object.entries(b).forEach(([k, v]) => (e[`billing_${k}`] = v));
    if (shipDifferent) {
      const s = validateAddress(shipping);
      Object.entries(s).forEach(([k, v]) => (e[`shipping_${k}`] = v));
    }
    return e;
  };

  const sub = (prefix) =>
    Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));

  /* ---- Place the order (real WooCommerce checkout) ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      setTimeout(() => formRef.current?.querySelector('.has-error input, .has-error select')?.focus(), 0);
      return;
    }

    const billingAddress = { ...pickAddress(billing), company: '', email: contact.email.trim(), phone: contact.phone.trim() };
    const shippingAddress = { ...pickAddress(shipDifferent ? shipping : billing), company: '', phone: contact.phone.trim() };

    setSubmitting(true);
    try {
      const result = await placeOrder({
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        customer_note: note,
        payment_method: needsPayment ? paymentMethod : '',
        payment_data: [],
        extensions: {},
      });

      const payment = result.payment_result || {};
      if (payment.payment_status === 'failure' || payment.payment_status === 'error') {
        const detail = (payment.payment_details || []).find((d) => /error/i.test(d.key))?.value;
        throw new Error(decodeHtml(detail || 'The payment could not be completed. Please try again or choose another payment method.'));
      }

      // Keep the real order data so the confirmation page can always show it.
      try {
        sessionStorage.setItem(
          `wcs_order_${result.order_id}`,
          JSON.stringify({
            result,
            email: contact.email.trim(),
            snapshot: { items: cart.items, totals: cart.totals, needs_shipping: cart.needs_shipping },
          })
        );
      } catch {
        /* sessionStorage not available - confirmation will load from the server only */
      }

      const confirmation = `/order-confirmation/${result.order_id}?key=${encodeURIComponent(result.order_key)}`;
      const url = payment.redirect_url;

      // Offline methods (COD, bank transfer, cheque) return WooCommerce's "order-received"
      // page, which we replace with our own confirmation page. Gateways such as PayPal or
      // Razorpay return an external / "order-pay" URL: send the customer there to pay.
      if (url && !/order-received/.test(url)) {
        window.location.assign(url);
        return;
      }

      await refresh(); // the cart is now empty
      navigate(confirmation, { replace: true });
    } catch (err) {
      setSubmitError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  // Typing in a field clears its error message.
  const clearError = (name) =>
    setErrors((cur) => {
      if (!cur[name]) return cur;
      const { [name]: _removed, ...rest } = cur;
      return rest;
    });
  const changeBilling = (field, value) => {
    setBilling((cur) => ({ ...cur, [field]: value }));
    clearError(`billing_${field}`);
  };
  const changeShipping = (field, value) => {
    setShipping((cur) => ({ ...cur, [field]: value }));
    clearError(`shipping_${field}`);
  };
  const changeContact = (field, value) => {
    setContact((cur) => ({ ...cur, [field]: value }));
    clearError(field);
  };
  const disabled = submitting || busy;

  return (
    <>
      <PageHeader title="Checkout" crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <form className="container checkout-layout" onSubmit={handleSubmit} ref={formRef} noValidate>
        <div className="checkout-main">
          {submitError && <ErrorMessage error={submitError} title="We couldn’t place your order" />}

          <section className="card">
            <h2>Contact details</h2>
            <div className="form-grid">
              <Field label="Email address" error={errors.email}>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => changeContact('email', e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => changeContact('phone', e.target.value)}
                  autoComplete="tel"
                />
              </Field>
            </div>
          </section>

          <section className="card">
            <h2>{cart.needs_shipping ? 'Billing & shipping address' : 'Billing address'}</h2>
            <AddressFields values={billing} errors={sub('billing_')} onChange={changeBilling} section="billing" />

            {cart.needs_shipping && (
              <label className="check">
                <input type="checkbox" checked={shipDifferent} onChange={(e) => setShipDifferent(e.target.checked)} />
                <span>Ship to a different address</span>
              </label>
            )}
          </section>

          {cart.needs_shipping && shipDifferent && (
            <section className="card">
              <h2>Shipping address</h2>
              <AddressFields values={shipping} errors={sub('shipping_')} onChange={changeShipping} section="shipping" />
            </section>
          )}

          {cart.needs_shipping && (
            <section className="card">
              <h2>Shipping method</h2>
              {calc.error && <p className="field-error">{calc.error}</p>}
              {!addressReady ? (
                <p className="muted">Enter your country and postcode to see shipping options.</p>
              ) : noShippingRates ? (
                <p className="notice notice-warn">
                  {calc.loading
                    ? 'Checking shipping options…'
                    : 'No shipping options are available for this address. Please check your address or contact us.'}
                </p>
              ) : (
                packages.map((pkg) => (
                  <fieldset className="radio-group" key={pkg.package_id} disabled={disabled}>
                    {packages.length > 1 && <legend>{decodeHtml(pkg.name)}</legend>}
                    {(pkg.shipping_rates || []).map((rate) => {
                      const price = Number(rate.price) + (incl ? Number(rate.taxes || 0) : 0);
                      return (
                        <label className={`radio-card ${rate.selected ? 'active' : ''}`} key={rate.rate_id}>
                          <input
                            type="radio"
                            name={`shipping-${pkg.package_id}`}
                            checked={Boolean(rate.selected)}
                            onChange={() => selectShipping(pkg.package_id, rate.rate_id).catch((err) => setCalc({ loading: false, error: err.message }))}
                          />
                          <span className="radio-card-text">
                            <strong>{decodeHtml(rate.name)}</strong>
                            {rate.delivery_time && <span className="muted">{decodeHtml(rate.delivery_time)}</span>}
                          </span>
                          <strong>{price === 0 ? 'Free' : formatMoney(price, rate)}</strong>
                        </label>
                      );
                    })}
                  </fieldset>
                ))
              )}
            </section>
          )}

          {needsPayment && (
            <section className="card">
              <h2>Payment method</h2>
              {noPaymentMethods ? (
                <p className="notice notice-warn">
                  No payment methods are available for this order. Please contact the store.
                </p>
              ) : (
                <fieldset className="radio-group" disabled={disabled}>
                  {methods.map((m) => (
                    <label className={`radio-card ${paymentMethod === m.id ? 'active' : ''}`} key={m.id}>
                      <input
                        type="radio"
                        name="payment_method"
                        value={m.id}
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                      />
                      <span className="radio-card-text">
                        <strong>{decodeHtml(m.title)}</strong>
                        {paymentMethod === m.id && m.description && <HtmlContent html={m.description} className="gateway-desc" />}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
            </section>
          )}

          <section className="card">
            <h2>Order notes</h2>
            <Field label="Notes about your order" required={false}>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Special notes for delivery (optional)" />
            </Field>
          </section>
        </div>

        <aside className="summary-card" aria-label="Order summary">
          <h2>Order summary</h2>
          <ul className="summary-items">
            {cart.items.map((item) => (
              <li key={item.key}>
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
                <strong>
                  {formatMoney(Number(item.totals.line_subtotal) + (incl ? Number(item.totals.line_subtotal_tax) : 0), item.totals)}
                </strong>
              </li>
            ))}
          </ul>

          <div className={calc.loading || busy ? 'is-updating' : ''}>
            <CartTotals cart={cart} />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={disabled || calc.loading || noPaymentMethods || noShippingRates}
          >
            {submitting ? 'Placing order…' : `Place order · ${formatMoney(cart.totals.total_price, cart.totals)}`}
          </button>
          <Link to="/cart" className="link-arrow back-link">
            ← Back to cart
          </Link>
        </aside>
      </form>
    </>
  );
}
