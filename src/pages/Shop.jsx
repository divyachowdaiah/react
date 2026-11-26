import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts } from '../api/store';
import { useAsync } from '../hooks/useAsync';
import { useCategories } from '../hooks/useCategories';
import { usePageTitle } from '../hooks/usePageTitle';
import { PRODUCTS_PER_PAGE } from '../config';
import { decodeHtml } from '../utils/format';
import PageHeader from '../components/PageHeader';
import ProductGrid from '../components/ProductGrid';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorMessage, ProductSkeletons } from '../components/Feedback';
import { SearchIcon } from '../components/Icons';

const SORTS = [
  { value: 'date-desc', label: 'Latest', orderby: 'date', order: 'desc' },
  { value: 'popularity-desc', label: 'Popularity', orderby: 'popularity', order: 'desc' },
  { value: 'rating-desc', label: 'Top rated', orderby: 'rating', order: 'desc' },
  { value: 'price-asc', label: 'Price: low to high', orderby: 'price', order: 'asc' },
  { value: 'price-desc', label: 'Price: high to low', orderby: 'price', order: 'desc' },
  { value: 'title-asc', label: 'Name: A–Z', orderby: 'title', order: 'asc' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const categorySlug = params.get('category') || '';
  const sortValue = params.get('sort') || 'date-desc';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const sort = SORTS.find((s) => s.value === sortValue) || SORTS[0];

  const { categories, error: categoriesError } = useCategories();
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Update one URL parameter. Changing anything except the page resets to page 1.
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const category = categories?.find((c) => c.slug === categorySlug);
  usePageTitle(category ? decodeHtml(category.name) : 'Shop');

  const { data, error, reload } = useAsync(async () => {
    // Wait for the category list so we can convert slug -> ID.
    if (categorySlug && !categories && !categoriesError) return undefined;
    if (categorySlug && categories && !category) return { products: [], total: 0, totalPages: 1 };
    return getProducts({
      search,
      category: category?.id,
      orderby: sort.orderby,
      order: sort.order,
      page,
      per_page: PRODUCTS_PER_PAGE,
    });
  }, [search, categorySlug, sort.value, page, categories]);

  // Parent categories first, each followed by its children.
  const categoryList = useMemo(() => {
    const list = categories || [];
    const ids = new Set(list.map((c) => c.id));
    const roots = list.filter((c) => !c.parent || !ids.has(c.parent));
    return roots.flatMap((root) => [
      { ...root, depth: 0 },
      ...list.filter((c) => c.parent === root.id).map((c) => ({ ...c, depth: 1 })),
    ]);
  }, [categories]);

  const submitSearch = (e) => {
    e.preventDefault();
    setParam('search', searchInput.trim());
  };

  const changePage = (p) => {
    setParam('page', p > 1 ? String(p) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => setParams(new URLSearchParams());
  const hasFilters = Boolean(search || categorySlug);

  return (
    <>
      <PageHeader
        title={category ? decodeHtml(category.name) : 'Shop'}
        subtitle={search ? `Results for “${search}”` : undefined}
        crumbs={[{ label: 'Shop', to: category ? '/shop' : undefined }, ...(category ? [{ label: decodeHtml(category.name) }] : [])]}
      />

      <div className="container shop-layout">
        <aside className="shop-sidebar" aria-label="Categories">
          <h2>Categories</h2>
          <ul>
            <li>
              <Link to="/shop" className={!categorySlug ? 'active' : ''}>
                All products
              </Link>
            </li>
            {categoryList.map((c) => (
              <li key={c.id} className={c.depth ? 'sub' : ''}>
                <Link
                  to={`/shop?category=${c.slug}`}
                  className={c.slug === categorySlug ? 'active' : ''}
                >
                  {decodeHtml(c.name)} <span className="muted">({c.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section className="shop-content">
          <div className="shop-toolbar">
            <form className="search search-box" onSubmit={submitSearch} role="search">
              <SearchIcon width={18} height={18} />
              <input
                type="search"
                placeholder="Search products"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search products"
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>
            </form>

            <label className="sort">
              <span className="muted">Sort by</span>
              <select value={sort.value} onChange={(e) => setParam('sort', e.target.value === 'date-desc' ? '' : e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {data && (
            <p className="muted result-count">
              {data.total} {data.total === 1 ? 'product' : 'products'}
              {hasFilters && (
                <>
                  {' · '}
                  <button type="button" className="link-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                </>
              )}
            </p>
          )}

          {error ? (
            <ErrorMessage error={error} onRetry={reload} title="Products could not be loaded" />
          ) : !data ? (
            <ProductSkeletons count={PRODUCTS_PER_PAGE} />
          ) : data.products.length === 0 ? (
            <EmptyState
              title="No products found"
              text="Try a different search term or category."
              actionLabel="View all products"
              actionTo="/shop"
            />
          ) : (
            <>
              <ProductGrid products={data.products} />
              <Pagination page={page} totalPages={data.totalPages} onChange={changePage} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
