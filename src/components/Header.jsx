import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import { CartIcon, CloseIcon, LeafIcon, MenuIcon, SearchIcon } from './Icons';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const { site } = useSite();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
    setOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label={`${site?.name || 'Store'} home`}>
          {site?.logo ? (
            <img src={site.logo} alt={site.name} className="brand-logo" />
          ) : (
            <>
              <span className="brand-mark">
                <LeafIcon width={20} height={20} />
              </span>
              <span className="brand-name">{site?.name || 'Store'}</span>
            </>
          )}
        </Link>

        <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main">
          <form className="search search-mobile" onSubmit={submitSearch} role="search">
            <SearchIcon width={18} height={18} />
            <input
              type="search"
              placeholder="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </form>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <form className="search search-desktop" onSubmit={submitSearch} role="search">
            <SearchIcon width={18} height={18} />
            <input
              type="search"
              placeholder="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </form>

          <Link to="/cart" className="cart-link" aria-label={`Cart, ${itemCount} items`}>
            <CartIcon />
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
