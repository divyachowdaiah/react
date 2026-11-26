import { formatMoney } from '../utils/format';

/** Shows a Store API `prices` object: single price, sale price or price range. */
export default function Price({ prices, onSale = false, className = '' }) {
  if (!prices) return null;

  const range = prices.price_range;
  if (range) {
    return (
      <span className={`price ${className}`}>
        <span className="price-current">
          {formatMoney(range.min_amount, prices)} – {formatMoney(range.max_amount, prices)}
        </span>
      </span>
    );
  }

  const showSale = onSale && prices.regular_price && prices.regular_price !== prices.price;
  return (
    <span className={`price ${className}`}>
      <span className="price-current">{formatMoney(prices.price, prices)}</span>
      {showSale && <del className="price-old">{formatMoney(prices.regular_price, prices)}</del>}
    </span>
  );
}
