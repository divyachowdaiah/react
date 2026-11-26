import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml, formatMoney, pricesIncludeTax } from '../utils/format';
import CartTotals from '../components/CartTotals';
import PageHeader from '../components/PageHeader';
import ProductImage from '../components/ProductImage';
import QuantityInput from '../components/QuantityInput';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';
import { TrashIcon } from '../components/Icons';

export default function Cart() {
  usePageTitle('Cart');
  const navigate = useNavigate();
  const { cart, loading, error, busy, refresh, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState('');
  const [couponError, setCouponError] = useState('');

  if (loading && !cart) {
    return (
      <>
        <PageHeader title="Your cart" />
        <div className="container section">
          <Spinner label="Loading your cart…" />
        </div>
      </>
    );
  }

  if (error && !cart) {
    return (
      <>
        <PageHeader title="Your cart" />
        <div className="container section">
          <ErrorMessage error={error} onRetry={refresh} title="Your cart could not be loaded" />
        </div>
      </>
    );
  }

  const items = cart?.items || [];
  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Your cart" />
        <div className="container section">
          <EmptyState
            title="Your cart is empty"
            text="Looks like you haven’t added anything yet."
            actionLabel="Start shopping"
            actionTo="/shop"
          />
        </div>
      </>
    );
  }

  const incl = pricesIncludeTax(cart);

  const submitCoupon = async (e) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setCouponError('');
    try {
      await applyCoupon(value);
      setCode('');
    } catch (err) {
      setCouponError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Your cart" subtitle={`${cart.items_count} ${cart.items_count === 1 ? 'item' : 'items'}`} />

      <div className="container cart-layout">
        <section className="cart-items" aria-label="Cart items">
          {items.map((item) => {
            const limits = item.quantity_limits || {};
            const lineSubtotal = Number(item.totals.line_subtotal) + (incl ? Number(item.totals.line_subtotal_tax) : 0);
            const name = decodeHtml(item.name);
            return (
              <article className="cart-item" key={item.key}>
                <Link to={`/product/${slugFromPermalink(item)}`} className="cart-item-image">
                  <ProductImage image={item.images?.[0]} alt={name} sizes="96px" />
                </Link>

                <div className="cart-item-info">
                  <h3>
                    <Link to={`/product/${slugFromPermalink(item)}`}>{name}</Link>
                  </h3>
                  {item.variation?.length > 0 && (
                    <ul className="cart-item-variation">
                      {item.variation.map((v) => (
                        <li key={v.attribute}>
                          {decodeHtml(v.attribute)}: {decodeHtml(v.value)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="muted">{formatMoney(item.prices.price, item.prices)} each</span>
                </div>

                <div className="cart-item-qty">
                  {limits.editable === false ? (
                    <span>Qty: {item.quantity}</span>
                  ) : (
                    <QuantityInput
                      value={item.quantity}
                      min={limits.minimum || 1}
                      max={limits.maximum || 0}
                      step={limits.multiple_of || 1}
                      disabled={busy}
                      onChange={(q) => q !== item.quantity && updateQuantity(item.key, q)}
                    />
                  )}
                </div>

                <div className="cart-item-total">
                  <strong>{formatMoney(lineSubtotal, item.totals)}</strong>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeItem(item.key)}
                    disabled={busy}
                    aria-label={`Remove ${name}`}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
              </article>
            );
          })}

          <Link to="/shop" className="link-arrow back-link">
            ← Continue shopping
          </Link>
        </section>

        <aside className="summary-card" aria-label="Order summary">
          <h2>Order summary</h2>

          <form className="coupon" onSubmit={submitCoupon}>
            <input
              type="text"
              placeholder="Coupon code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Coupon code"
            />
            <button type="submit" className="btn btn-outline btn-sm" disabled={busy || !code.trim()}>
              Apply
            </button>
          </form>
          {couponError && <p className="field-error">{couponError}</p>}

          {cart.coupons?.length > 0 && (
            <ul className="coupon-list">
              {cart.coupons.map((c) => (
                <li key={c.code}>
                  <span className="chip">{c.code.toUpperCase()}</span>
                  <button type="button" className="link-btn" onClick={() => removeCoupon(c.code)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <CartTotals cart={cart} />

          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/checkout')} disabled={busy}>
            Proceed to checkout
          </button>
        </aside>
      </div>
    </>
  );
}

/** Cart items only contain the full permalink; the last path segment is the product slug. */
function slugFromPermalink(item) {
  try {
    const parts = new URL(item.permalink).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || item.id;
  } catch {
    return item.id;
  }
}
