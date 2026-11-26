import { usePageTitle } from '../hooks/usePageTitle';
import { EmptyState } from '../components/Feedback';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="container section">
      <EmptyState
        title="Page not found"
        text="The page you are looking for doesn’t exist or has moved."
        actionLabel="Back to home"
        actionTo="/"
      />
    </div>
  );
}
