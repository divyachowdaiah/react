import { request, postForm, ApiError } from './http';
import { POSTS_PER_PAGE } from '../config';

/** WordPress core REST API (/wp-json/wp/v2) + optional helper plugin. */

/* ----- Site info ----- */

export async function getSiteInfo() {
  const { data } = await request('/');
  let logo = '';
  if (data && data.site_logo) {
    try {
      const media = await request(`/wp/v2/media/${data.site_logo}`);
      logo = media.data?.source_url || '';
    } catch {
      /* logo is optional */
    }
  }
  return {
    name: data?.name || 'Store',
    description: data?.description || '',
    url: data?.url || '',
    logo,
  };
}

/**
 * Optional: public config from the "React Store Helper" plugin
 * (payment method titles, country + state lists). Returns null when the
 * plugin is not installed - the app then falls back to sensible defaults.
 */
export async function getHelperConfig() {
  try {
    const { data } = await request('/react-store/v1/config');
    return data && data.gateways ? data : null;
  } catch {
    return null;
  }
}

/* ----- Pages ----- */

export async function getPageBySlug(slug) {
  const { data } = await request('/wp/v2/pages', { params: { slug, _embed: 1 } });
  if (Array.isArray(data) && data[0]) return data[0];
  throw new ApiError(`The page "${slug}" was not found in WordPress.`, 404, 'not_found');
}

/* ----- Blog ----- */

export async function getPosts({ page = 1, perPage = POSTS_PER_PAGE } = {}) {
  const { data, headers } = await request('/wp/v2/posts', {
    params: { page, per_page: perPage, _embed: 1 },
  });
  return {
    posts: Array.isArray(data) ? data : [],
    totalPages: Number(headers.get('X-WP-TotalPages') || 1),
  };
}

export async function getPostBySlug(slug) {
  const { data } = await request('/wp/v2/posts', { params: { slug, _embed: 1 } });
  if (Array.isArray(data) && data[0]) return data[0];
  throw new ApiError('This article could not be found.', 404, 'not_found');
}

/** Featured image URL of a post/page that was fetched with _embed. */
export const featuredImage = (item) =>
  item?._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

/* ----- Contact Form 7 (optional) ----- */

export async function sendContactForm(formId, values) {
  const body = new FormData();
  Object.entries(values).forEach(([k, v]) => body.append(k, v));
  body.append('_wpcf7_unit_tag', `wpcf7-f${formId}-react`);
  const data = await postForm(`/contact-form-7/v1/contact-forms/${formId}/feedback`, body);
  if (data?.status !== 'mail_sent') {
    throw new ApiError(data?.message || 'Your message could not be sent.', 400);
  }
  return data.message;
}
