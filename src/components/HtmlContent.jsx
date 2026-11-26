import { useMemo } from 'react';
import { sanitizeHtml } from '../utils/sanitize';

/** Renders HTML that comes from WordPress (cleaned first). */
export default function HtmlContent({ html, className = '' }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  if (!clean) return null;
  return <div className={`wp-content ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
