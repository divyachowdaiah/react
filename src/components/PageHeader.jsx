import { Link } from 'react-router-dom';

/** Light green title band used at the top of inner pages. */
export default function PageHeader({ title, subtitle, crumbs = [] }) {
  return (
    <section className="page-header">
      <div className="container">
        {crumbs.length > 0 && (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {crumbs.map((c) => (
              <span key={c.label}>
                <span aria-hidden="true"> / </span>
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
    </section>
  );
}
