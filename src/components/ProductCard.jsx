import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { decodeHtml } from '../utils/format';
import Price from './Price';
import ProductImage from './ProductImage';
import { StarIcon } from './Icons';

export default function ProductCard({ product }) {
  const { addToCart, busy } = useCart();

  const name = decodeHtml(product.name);
  const link = `/product/${product.slug}`;
  const category = product.categories?.[0];
  const rating = Number(product.average_rating) || 0;

  const outOfStock = !product.is_in_stock;
  // Only simple products can be added straight from the card.
  const canQuickAdd = product.type === 'simple' && product.is_purchasable && !outOfStock;

  return (
    <article className="product-card">
      <Link to={link} className="product-card-media" aria-label={name}>
        <ProductImage
          image={product.images?.[0]}
          alt={name}
          sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 280px"
        />
        {product.on_sale && !outOfStock && <span className="badge badge-sale">Sale</span>}
        {outOfStock && <span className="badge badge-muted">Out of stock</span>}
      </Link>

      <div className="product-card-body">
        {category && <span className="product-card-cat">{decodeHtml(category.name)}</span>}
        <h3 className="product-card-title">
          <Link to={link}>{name}</Link>
        </h3>
        {rating > 0 && (
          <span className="rating" title={`${rating} out of 5`}>
            <StarIcon width={14} height={14} /> {rating.toFixed(1)}
            <span className="muted"> ({product.review_count})</span>
          </span>
        )}
        <Price prices={product.prices} onSale={product.on_sale} />

        {canQuickAdd ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={() =>
              addToCart({
                id: product.id,
                quantity: product.add_to_cart?.minimum || 1,
                name,
              })
            }
          >
            Add to cart
          </button>
        ) : (
          <Link to={link} className={`btn btn-outline btn-block ${outOfStock ? 'is-disabled' : ''}`}>
            {outOfStock ? 'View product' : product.type === 'variable' ? 'Select options' : 'View product'}
          </Link>
        )}
      </div>
    </article>
  );
}
