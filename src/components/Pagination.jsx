/** Previous / numbered / next pagination. `onChange(page)` is called on click. */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      {start > 1 && (
        <>
          <button type="button" onClick={() => onChange(1)}>
            1
          </button>
          {start > 2 && <span className="muted">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          type="button"
          key={p}
          className={p === page ? 'active' : ''}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="muted">…</span>}
          <button type="button" onClick={() => onChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
