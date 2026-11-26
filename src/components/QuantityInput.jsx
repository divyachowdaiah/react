import { MinusIcon, PlusIcon } from './Icons';

/**
 * − [ 2 ] +  stepper. Respects WooCommerce limits:
 * min, max (0/undefined = unlimited) and step ("multiple_of").
 */
export default function QuantityInput({ value, onChange, min = 1, max = 0, step = 1, disabled = false }) {
  const limit = max && max > 0 ? max : Infinity;
  const clamp = (n) => {
    if (Number.isNaN(n)) return min;
    return Math.min(limit, Math.max(min, n));
  };

  return (
    <div className="qty" aria-label="Quantity">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon width={16} height={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={limit === Infinity ? undefined : limit}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled || value >= limit}
        aria-label="Increase quantity"
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}
