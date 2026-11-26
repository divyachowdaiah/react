import { Link, useSearchParams } from 'react-router-dom';
import { featuredImage, getPosts } from '../api/wp';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml, formatDate, plainText } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';

export default function Blog() {
  usePageTitle('Blog');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  const { data, error, reload } = useAsync(() => getPosts({ page }), [page]);

  const changePage = (p) => {
    setParams(p > 1 ? { page: String(p) } : {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageHeader title="Blog" subtitle="News, tips and updates" />
      <div className="container section">
        {error ? (
          <ErrorMessage error={error} onRetry={reload} title="Articles could not be loaded" />
        ) : !data ? (
          <Spinner />
        ) : data.posts.length === 0 ? (
          <EmptyState title="No articles yet" text="Check back soon." />
        ) : (
          <>
            <div className="post-grid">
              {data.posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="post-card">
                  {featuredImage(post) && <img src={featuredImage(post)} alt="" loading="lazy" />}
                  <div className="post-card-body">
                    <span className="muted">{formatDate(post.date)}</span>
                    <h3>{decodeHtml(post.title.rendered)}</h3>
                    <p className="muted">{plainText(post.excerpt?.rendered).slice(0, 140)}…</p>
                    <span className="link-arrow">Read more →</span>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={data.totalPages} onChange={changePage} />
          </>
        )}
      </div>
    </>
  );
}
