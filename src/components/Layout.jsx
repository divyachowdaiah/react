import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { MISSING_WP_URL } from '../config';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main className="site-main">
        {MISSING_WP_URL && (
          <div className="container">
            <div className="notice notice-warn">
              <strong>WordPress URL is not set.</strong>
              <p>
                Copy <code>.env.example</code> to <code>.env</code>, set <code>VITE_WP_URL</code> to your
                WooCommerce site and restart <code>npm run dev</code>.
              </p>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
