import { formatMoney, pricesIncludeTax } from '../utils/format';

/**
 * Subtotal / discount / shipping / tax / total, straight from the WooCommerce
 * cart (or order) totals. Works with either object: { items, totals, needs_shipping }.
 */
export default function CartTotals({ cart }) {
  const t = cart?.totals;
  if (!t) return null;

  const num = (v) => Number(v || 0);
  const incl = pricesIncludeTax(cart);

  const subtotal = num(t.total_items) + (incl ? num(t.total_items_tax) : 0);
  const discount = num(t.total_discount) + (incl ? num(t.total_discount_tax) : 0);
  const fees = num(t.total_fees) + (incl ? num(t.total_fees_tax) : 0);
  const shippingKnown = t.total_shipping !== null && t.total_shipping !== undefined;
  const shipping = num(t.total_shipping) + (incl ? num(t.total_shipping_tax) : 0);
  const taxLines = (t.tax_lines || []).filter((l) => num(l.price) > 0);

  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMoney(subtotal, t)}</dd>
      </div>

      {discount > 0 && (
        <div className="totals-discount">
          <dt>Discount</dt>
          <dd>−{formatMoney(discount, t)}</dd>
        </div>
      )}

      {fees > 0 && (
        <div>
          <dt>Fees</dt>
          <dd>{formatMoney(fees, t)}</dd>
        </div>
      )}

      {cart.needs_shipping && (
        <div>
          <dt>Shipping</dt>
          <dd>
            {!shippingKnown ? (
              <span className="muted">Calculated at checkout</span>
            ) : shipping === 0 ? (
              'Free'
            ) : (
              formatMoney(shipping, t)
            )}
          </dd>
        </div>
      )}

      {!incl &&
        taxLines.map((line) => (
          <div key={line.name}>
            <dt>{line.name}</dt>
            <dd>{formatMoney(line.price, t)}</dd>
          </div>
        ))}

      <div className="totals-total">
        <dt>Total</dt>
        <dd>{formatMoney(t.total_price, t)}</dd>
      </div>

      {incl && taxLines.length > 0 && (
        <p className="totals-note muted">
          Includes {taxLines.map((l) => `${formatMoney(l.price, t)} ${l.name}`).join(', ')}
        </p>
      )}
    </dl>
  );
}
