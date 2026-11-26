import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { useCategories } from '../hooks/useCategories';
import { CONTACT_EMAIL } from '../config';
import { decodeHtml } from '../utils/format';
import { LeafIcon } from './Icons';

export default function Footer() {
  const { site } = useSite();
  const { categories } = useCategories();
  const topCategories = (categories || []).filter((c) => c.parent === 0).slice(0, 5);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <span className="brand brand-light">
            <span className="brand-mark">
              <LeafIcon width={20} height={20} />
            </span>
            <span className="brand-name">{site?.name || 'Store'}</span>
          </span>
          {site?.description && <p>{decodeHtml(site.description)}</p>}
          {CONTACT_EMAIL && (
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          )}
        </div>

        <div>
          <h4>Explore</h4>
          <ul>
            <li>
              <Link to="/shop">Shop</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/services">Services</Link>
            </li>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        {topCategories.length > 0 && (
          <div>
            <h4>Categories</h4>
            <ul>
              {topCategories.map((c) => (
                <li key={c.id}>
                  <Link to={`/shop?category=${c.slug}`}>{decodeHtml(c.name)}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4>Your order</h4>
          <ul>
            <li>
              <Link to="/cart">Shopping cart</Link>
            </li>
            <li>
              <Link to="/checkout">Checkout</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} {site?.name || 'Store'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
