import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an async function whenever `deps` change and tracks loading / error state.
 *
 *   const { data, error, loading, reload } = useAsync(() => getProducts(), []);
 *
 * Previous data is kept while a new request is loading (smooth filtering).
 * If the function returns `undefined`, the request is skipped.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.resolve(fn())
      .then((data) => {
        if (!cancelled) setState({ data: data ?? null, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload };
}
