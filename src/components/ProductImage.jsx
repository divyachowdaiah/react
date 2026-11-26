import { useState } from 'react';
import { ImageIcon } from './Icons';
import { decodeHtml } from '../utils/format';

/** Product image with lazy loading and a neutral placeholder if it is missing or fails. */
export default function ProductImage({ image, alt = '', eager = false, sizes }) {
  const [failed, setFailed] = useState(false);

  if (!image?.src || failed) {
    return (
      <div className="img-placeholder" role="img" aria-label={alt || 'No image'}>
        <ImageIcon width={36} height={36} />
      </div>
    );
  }

  return (
    <img
      src={image.src}
      srcSet={image.srcset || undefined}
      sizes={sizes || image.sizes || undefined}
      alt={decodeHtml(image.alt || alt)}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
