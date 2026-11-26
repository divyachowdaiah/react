import { Link } from 'react-router-dom';

/** Spinning loader */
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-box" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

/** Friendly error box with an optional "Try again" button. */
export function ErrorMessage({ error, onRetry, title = 'Something went wrong' }) {
  const message = typeof error === 'string' ? error : error?.message;
  return (
    <div className="notice notice-error" role="alert">
      <strong>{title}</strong>
      <p>{message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Empty state with an optional call-to-action link. */
export function EmptyState({ title, text, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {text && <p className="muted">{text}</p>}
      {actionTo && (
        <Link to={actionTo} className="btn btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** Grey placeholder cards shown while products load. */
export function ProductSkeletons({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="product-card skeleton-card" key={i}>
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
