import { Link } from 'react-router-dom';
import { getProducts } from '../api/store';
import { getPosts, featuredImage } from '../api/wp';
import { useAsync } from '../hooks/useAsync';
import { useCategories } from '../hooks/useCategories';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSite } from '../context/SiteContext';
import { decodeHtml, formatDate, plainText } from '../utils/format';
import ProductGrid from '../components/ProductGrid';
import ProductImage from '../components/ProductImage';
import { ErrorMessage, ProductSkeletons } from '../components/Feedback';
import { ArrowRightIcon, LeafIcon } from '../components/Icons';

export default function Home() {
  usePageTitle('');
  const { site } = useSite();
  const { categories } = useCategories();

  // Featured products; if none are marked "featured" in WooCommerce, show the newest.
  const featured = useAsync(async () => {
    const first = await getProducts({ featured: true, per_page: 8 });
    if (first.products.length) return { products: first.products, isFeatured: true };
    const latest = await getProducts({ per_page: 8, orderby: 'date', order: 'desc' });
    return { products: latest.products, isFeatured: false };
  }, []);

  const onSale = useAsync(async () => (await getProducts({ on_sale: true, per_page: 4 })).products, []);
  const posts = useAsync(async () => (await getPosts({ perPage: 3 })).posts, []);

  const heroProduct = featured.data?.products?.find((p) => p.images?.length);
  const topCategories = (categories || []).filter((c) => !c.parent).slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <span className="eyebrow">Welcome to {site?.name || 'our store'}</span>
            <h1>Quality products you’ll love, ready to order.</h1>
            <p>
              {site?.description
                ? decodeHtml(site.description)
                : 'Browse the collection, add what you like to your cart and check out securely in a few steps.'}
            </p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-lg">
                Shop now <ArrowRightIcon width={18} height={18} />
              </Link>
              <Link to="/about" className="btn btn-outline btn-lg">
                Learn more
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden={!heroProduct}>
            <div className="hero-blob" />
            {heroProduct ? (
              <Link to={`/product/${heroProduct.slug}`} className="hero-card">
                <ProductImage image={heroProduct.images[0]} alt={decodeHtml(heroProduct.name)} eager />
              </Link>
            ) : (
              <div className="hero-card hero-card-empty">
                <LeafIcon width={72} height={72} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {topCategories.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Shop by category</h2>
              <Link to="/shop" className="link-arrow">
                All products <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
            <div className="category-grid">
              {topCategories.map((c) => (
                <Link key={c.id} to={`/shop?category=${c.slug}`} className="category-card">
                  <span className="category-media">
                    {c.image?.src ? (
                      <img src={c.image.src} alt="" loading="lazy" />
                    ) : (
                      <LeafIcon width={34} height={34} />
                    )}
                  </span>
                  <strong>{decodeHtml(c.name)}</strong>
                  <span className="muted">
                    {c.count} {c.count === 1 ? 'product' : 'products'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED */}
      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <h2>{featured.data?.isFeatured === false ? 'Latest products' : 'Featured products'}</h2>
            <Link to="/shop" className="link-arrow">
              View all <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>
          {featured.error ? (
            <ErrorMessage error={featured.error} onRetry={featured.reload} title="Products could not be loaded" />
          ) : featured.data ? (
            featured.data.products.length ? (
              <ProductGrid products={featured.data.products} />
            ) : (
              <p className="muted">No products have been published yet.</p>
            )
          ) : (
            <ProductSkeletons count={4} />
          )}
        </div>
      </section>

      {/* ON SALE (only when something is on sale) */}
      {onSale.data?.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>On sale</h2>
            </div>
            <ProductGrid products={onSale.data} />
          </div>
        </section>
      )}

      {/* BLOG */}
      {posts.data?.length > 0 && (
        <section className="section section-tint">
          <div className="container">
            <div className="section-head">
              <h2>From the blog</h2>
              <Link to="/blog" className="link-arrow">
                All articles <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
            <div className="post-grid">
              {posts.data.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="post-card">
                  {featuredImage(post) && <img src={featuredImage(post)} alt="" loading="lazy" />}
                  <div className="post-card-body">
                    <span className="muted">{formatDate(post.date)}</span>
                    <h3>{decodeHtml(post.title.rendered)}</h3>
                    <p className="muted">{plainText(post.excerpt?.rendered).slice(0, 110)}…</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Have a question?</h2>
              <p>We’re happy to help with products, orders or anything else.</p>
            </div>
            <Link to="/contact" className="btn btn-light btn-lg">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
