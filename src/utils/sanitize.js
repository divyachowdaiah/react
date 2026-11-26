/**
 * Minimal HTML cleaner for content that comes from WordPress (pages, posts,
 * product descriptions) before we render it with dangerouslySetInnerHTML.
 * It removes scripts, styles, forms, inline event handlers and javascript: links.
 */
const REMOVE_TAGS = ['script', 'style', 'link', 'meta', 'object', 'embed', 'form', 'base', 'noscript'];
const SAFE_IFRAME = /^(https?:)?\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|google\.com\/maps|www\.google\.com\/maps)/i;

export function sanitizeHtml(html = '') {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  root.querySelectorAll(REMOVE_TAGS.join(',')).forEach((el) => el.remove());

  root.querySelectorAll('iframe').forEach((el) => {
    if (!SAFE_IFRAME.test(el.getAttribute('src') || '')) el.remove();
  });

  root.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return root.innerHTML;
}
