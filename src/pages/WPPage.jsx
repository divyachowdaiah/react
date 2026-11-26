import { getPageBySlug, featuredImage } from '../api/wp';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml } from '../utils/format';
import HtmlContent from '../components/HtmlContent';
import PageHeader from '../components/PageHeader';
import { ErrorMessage, Spinner } from '../components/Feedback';

/**
 * Shows an existing WordPress page (About, Services, ...).
 * The content is fetched live from /wp-json/wp/v2/pages?slug=...
 */
export default function WPPage({ slug, fallbackTitle }) {
  const { data: page, error, reload } = useAsync(() => getPageBySlug(slug), [slug]);
  const title = page ? decodeHtml(page.title.rendered) : fallbackTitle;
  usePageTitle(title);

  return (
    <>
      <PageHeader title={title} />
      <div className="container narrow section">
        {error ? (
          <ErrorMessage
            error={error}
            onRetry={reload}
            title={error.status === 404 ? 'Page not found' : 'This page could not be loaded'}
          />
        ) : !page || page.slug !== slug ? (
          <Spinner />
        ) : (
          <>
            {featuredImage(page) && <img className="page-image" src={featuredImage(page)} alt="" />}
            <HtmlContent html={page.content.rendered} />
          </>
        )}
      </div>
    </>
  );
}
