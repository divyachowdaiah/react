import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProductBySlug, getProducts, getVariations } from '../api/store';
import { useCart } from '../context/CartContext';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml } from '../utils/format';
import HtmlContent from '../components/HtmlContent';
import PageHeader from '../components/PageHeader';
import Price from '../components/Price';
import ProductGrid from '../components/ProductGrid';
import ProductImage from '../components/ProductImage';
import QuantityInput from '../components/QuantityInput';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';
import { StarIcon } from '../components/Icons';

const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/** Does a variation fit the chosen options? (An empty value means "any".) */
const variationMatches = (variation, selection) =>
  variation.attributes.every((a) => !a.value || !selection[a.name] || same(a.value, selection[a.name]));

export default function ProductDetails() {
  const { slug } = useParams();
  const { data: product, error, reload } = useAsync(() => getProductBySlug(slug), [slug]);
  usePageTitle(product ? decodeHtml(product.name) : 'Product');

  if (error) {
    return (
      <div className="container section">
        {error.status === 404 ? (
          <EmptyState
            title="Product not found"
            text="It may have been removed or is no longer available."
            actionLabel="Back to shop"
            actionTo="/shop"
          />
        ) : (
          <ErrorMessage error={error} onRetry={reload} title="This product could not be loaded" />
        )}
      </div>
    );
  }

  // `product` still holds the previous product for a moment when the URL changes.
  if (!product || (product.slug !== slug && String(product.id) !== slug)) {
    return (
      <div className="container section">
        <Spinner label="Loading product…" />
      </div>
    );
  }

  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }) {
  const { addToCart, busy } = useCart();
  const name = decodeHtml(product.name);
  const isVariable = product.type === 'variable';

  const variationsState = useAsync(
    () => (isVariable ? getVariations(product) : Promise.resolve([])),
    [product.id]
  );
  const variations = variationsState.data || [];

  // Attributes the customer has to choose (size, color, ...)
  const variantAttrs = useMemo(
    () => (product.attributes || []).filter((a) => a.has_variations),
    [product]
  );

  const [selected, setSelected] = useState(() => {
    const initial = {};
    variantAttrs.forEach((a) => {
      const def = a.terms?.find((t) => t.default);
      if (def) initial[a.name] = def.slug;
    });
    return initial;
  });

  const allChosen = variantAttrs.every((a) => selected[a.name]);
  const matched = useMemo(
    () => (isVariable && allChosen ? variations.find((v) => variationMatches(v, selected)) : null),
    [isVariable, allChosen, variations, selected]
  );
  const source = matched ? matched.product : product; // what price / stock / limits come from

  // Quantity (respects WooCommerce min / max / step)
  const limits = source.add_to_cart || {};
  const minQty = limits.minimum || 1;
  const maxQty = limits.maximum || 0;
  const step = limits.multiple_of || 1;
  const [quantity, setQuantity] = useState(minQty);
  useEffect(() => {
    setQuantity(minQty);
  }, [matched?.id, minQty]);

  // Gallery: the chosen variation's image first, then the product images.
  const images = useMemo(() => {
    const own = matched?.product?.images || [];
    const rest = (product.images || []).filter((img) => !own.some((o) => o.id === img.id));
    return [...own, ...rest];
  }, [matched, product.images]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    setActive(0);
  }, [matched?.id]);

  const related = useAsync(async () => {
    const cat = product.categories?.[0];
    if (!cat) return [];
    const res = await getProducts({ category: cat.id, exclude: product.id, per_page: 4 });
    return res.products;
  }, [product.id]);

  // Is an option still available given the other choices?
  const optionAvailable = (attr, term) => {
    if (!variations.length) return true;
    const test = { ...selected, [attr.name]: term.slug };
    return variations.some((v) => v.product.is_in_stock && variationMatches(v, test));
  };

  const chooseOption = (attrName, slug) => setSelected((s) => ({ ...s, [attrName]: slug }));

  // What the customer can do right now
  const inStock = source.is_in_stock;
  const purchasable = source.is_purchasable !== false;
  const missing = variantAttrs.filter((a) => !selected[a.name]).map((a) => a.name);
  const noMatch = isVariable && allChosen && !matched && !variationsState.loading;

  let canAdd = inStock && purchasable;
  if (isVariable) canAdd = canAdd && Boolean(matched);

  const handleAdd = () => {
    const variation = variantAttrs.map((a) => ({ attribute: a.name, value: selected[a.name] }));
    addToCart({
      id: isVariable ? matched.id : product.id,
      quantity,
      variation: isVariable ? variation : [],
      name,
    });
  };

  const category = product.categories?.[0];
  const rating = Number(product.average_rating) || 0;
  const sku = source.sku || product.sku;

  return (
    <>
      <PageHeader
        title={name}
        crumbs={[
          { label: 'Shop', to: '/shop' },
          ...(category ? [{ label: decodeHtml(category.name), to: `/shop?category=${category.slug}` }] : []),
          { label: name },
        ]}
      />

      <div className="container product-layout">
        {/* Gallery */}
        <div className="gallery">
          <div className="gallery-main">
            <ProductImage image={images[active]} alt={name} eager sizes="(max-width: 900px) 100vw, 560px" />
            {product.on_sale && inStock && <span className="badge badge-sale">Sale</span>}
          </div>
          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  type="button"
                  className={i === active ? 'active' : ''}
                  onClick={() => setActive(i)}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={img.thumbnail || img.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="product-info">
          {rating > 0 && (
            <span className="rating">
              <StarIcon width={16} height={16} /> {rating.toFixed(1)}
              <span className="muted"> ({product.review_count} reviews)</span>
            </span>
          )}

          <Price prices={source.prices?.price ? source.prices : product.prices} onSale={source.on_sale} className="price-lg" />

          {product.short_description && <HtmlContent html={product.short_description} className="short-desc" />}

          {/* Variation pickers */}
          {isVariable &&
            variantAttrs.map((attr) => (
              <fieldset className="option-group" key={attr.name}>
                <legend>
                  {decodeHtml(attr.name)}
                  {selected[attr.name] && (
                    <span className="muted">
                      {' '}
                      — {decodeHtml(attr.terms.find((t) => same(t.slug, selected[attr.name]))?.name || selected[attr.name])}
                    </span>
                  )}
                </legend>
                <div className="option-list">
                  {attr.terms.map((term) => {
                    const available = optionAvailable(attr, term);
                    return (
                      <button
                        type="button"
                        key={term.slug}
                        className={`option ${same(selected[attr.name], term.slug) ? 'active' : ''} ${available ? '' : 'unavailable'}`}
                        onClick={() => chooseOption(attr.name, term.slug)}
                        aria-pressed={same(selected[attr.name], term.slug)}
                        title={available ? undefined : 'Currently unavailable'}
                      >
                        {decodeHtml(term.name)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

          {isVariable && variationsState.loading && <p className="muted">Loading options…</p>}
          {isVariable && variationsState.error && (
            <ErrorMessage error={variationsState.error} onRetry={variationsState.reload} title="Options could not be loaded" />
          )}

          {/* Stock */}
          {(!isVariable || matched) && (
            <p className={`stock ${inStock ? 'in' : 'out'}`}>
              {inStock
                ? source.low_stock_remaining
                  ? `Only ${source.low_stock_remaining} left in stock`
                  : 'In stock'
                : 'Out of stock'}
            </p>
          )}
          {noMatch && <p className="stock out">This combination is not available.</p>}

          {/* Buy area */}
          {product.type === 'external' ? (
            <a
              className="btn btn-primary btn-lg"
              href={product.add_to_cart?.url || product.permalink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {product.add_to_cart?.text || 'Buy product'}
            </a>
          ) : product.type === 'grouped' ? (
            <a className="btn btn-primary btn-lg" href={product.permalink}>
              View product options
            </a>
          ) : (
            <>
              <div className="buy-row">
                <QuantityInput
                  value={quantity}
                  onChange={setQuantity}
                  min={minQty}
                  max={maxQty}
                  step={step}
                  disabled={!canAdd}
                />
                <button type="button" className="btn btn-primary btn-lg" disabled={!canAdd || busy} onClick={handleAdd}>
                  {inStock || (isVariable && !matched) ? 'Add to cart' : 'Out of stock'}
                </button>
              </div>
              {isVariable && missing.length > 0 && !variationsState.loading && (
                <p className="muted hint">Please choose: {missing.map(decodeHtml).join(', ')}</p>
              )}
            </>
          )}

          <ul className="meta-list">
            {sku && (
              <li>
                <span>SKU:</span> {sku}
              </li>
            )}
            {product.categories?.length > 0 && (
              <li>
                <span>Categories:</span>{' '}
                {product.categories.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ', '}
                    <Link to={`/shop?category=${c.slug}`}>{decodeHtml(c.name)}</Link>
                  </span>
                ))}
              </li>
            )}
          </ul>
        </div>
      </div>

      {product.description && (
        <section className="container product-description">
          <h2>Description</h2>
          <HtmlContent html={product.description} />
        </section>
      )}

      {related.data?.length > 0 && (
        <section className="section section-tint">
          <div className="container">
            <div className="section-head">
              <h2>You may also like</h2>
            </div>
            <ProductGrid products={related.data} />
          </div>
        </section>
      )}
    </>
  );
}
