import { useEffect, useState } from 'react';
import { getCategories } from '../api/store';

// Categories rarely change, so load them once and share between pages.
let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = getCategories()
      .then((list) => {
        cache = list;
        return list;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useCategories() {
  const [state, setState] = useState({ categories: cache, error: null });

  useEffect(() => {
    if (cache) return undefined;
    let cancelled = false;
    load()
      .then((categories) => !cancelled && setState({ categories, error: null }))
      .catch((error) => !cancelled && setState({ categories: null, error }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
