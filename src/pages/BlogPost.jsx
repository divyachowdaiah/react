import { Link, useParams } from 'react-router-dom';
import { featuredImage, getPostBySlug } from '../api/wp';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml, formatDate } from '../utils/format';
import HtmlContent from '../components/HtmlContent';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';

export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, error, reload } = useAsync(() => getPostBySlug(slug), [slug]);
  usePageTitle(post ? decodeHtml(post.title.rendered) : 'Blog');

  if (error) {
    return (
      <div className="container section">
        {error.status === 404 ? (
          <EmptyState title="Article not found" actionLabel="Back to blog" actionTo="/blog" />
        ) : (
          <ErrorMessage error={error} onRetry={reload} title="This article could not be loaded" />
        )}
      </div>
    );
  }

  if (!post || post.slug !== slug) {
    return (
      <div className="container section">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={decodeHtml(post.title.rendered)}
        subtitle={formatDate(post.date)}
        crumbs={[{ label: 'Blog', to: '/blog' }, { label: decodeHtml(post.title.rendered) }]}
      />
      <article className="container narrow section">
        {featuredImage(post) && <img className="page-image" src={featuredImage(post)} alt="" />}
        <HtmlContent html={post.content.rendered} />
        <p>
          <Link to="/blog" className="link-arrow">
            ← Back to all articles
          </Link>
        </p>
      </article>
    </>
  );
}
