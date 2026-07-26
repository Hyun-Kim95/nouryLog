import { useEffect, useState } from 'react';
import { ApiError, isAuthDenied, isRequestAborted } from '../api';
import { fetchMealEntrySuggestions, type MealEntrySuggestionItem } from '../api/meals';
import { ensureAccessToken } from '../authSession';
import { LOG_COPY } from '../copy/log';
import { logAppError } from '../lib/userFacingError';

const DEBOUNCE_MS = 300;
const SUGGEST_LIMIT = 8;

export type MealEntrySuggestionsStatus = 'idle' | 'loading' | 'success' | 'error';

export type MealEntrySuggestionsError = 'network' | 'unavailable' | null;

export type UseMealEntrySuggestionsOptions = {
  /** Log D-9: past_meal. MealSet 등 기본(all)=템플릿+과거. */
  sources?: 'all' | 'past_meal';
};

export function useMealEntrySuggestions(
  q: string,
  enabled: boolean,
  options?: UseMealEntrySuggestionsOptions,
): {
  items: MealEntrySuggestionItem[];
  status: MealEntrySuggestionsStatus;
  errorKind: MealEntrySuggestionsError;
} {
  const sources = options?.sources ?? 'all';
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<MealEntrySuggestionItem[]>([]);
  const [status, setStatus] = useState<MealEntrySuggestionsStatus>('idle');
  const [errorKind, setErrorKind] = useState<MealEntrySuggestionsError>(null);

  useEffect(() => {
    if (!enabled) {
      setDebouncedQ('');
      setItems([]);
      setStatus('idle');
      setErrorKind(null);
      return;
    }
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setDebouncedQ('');
      setItems([]);
      setStatus('idle');
      setErrorKind(null);
      return;
    }
    const timer = setTimeout(() => setDebouncedQ(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, enabled]);

  useEffect(() => {
    if (!enabled || debouncedQ.length < 1) {
      return;
    }

    const controller = new AbortController();
    let stale = false;

    void (async () => {
      setStatus('loading');
      setErrorKind(null);
      try {
        const token = await ensureAccessToken();
        if (!token) {
          if (stale) return;
          setItems([]);
          setStatus('error');
          setErrorKind('network');
          return;
        }
        const res = await fetchMealEntrySuggestions(token, {
          q: debouncedQ,
          limit: SUGGEST_LIMIT,
          sources,
          signal: controller.signal,
        });
        if (stale) return;
        setItems(res.items ?? []);
        setStatus('success');
        setErrorKind(null);
      } catch (e) {
        if (stale || isRequestAborted(e)) return;
        setItems([]);
        setStatus('error');
        if (e instanceof ApiError && e.status === 404) {
          setErrorKind('unavailable');
        } else {
          setErrorKind('network');
        }
        if (__DEV__) {
          if (isAuthDenied(e)) {
            logAppError('[useMealEntrySuggestions] auth denied (silent)', e);
          } else {
            logAppError('[useMealEntrySuggestions] failed', e);
          }
        }
      }
    })();

    return () => {
      stale = true;
      controller.abort();
    };
  }, [debouncedQ, enabled, sources]);

  return { items, status, errorKind };
}

export function mealEntrySuggestionsErrorMessage(errorKind: MealEntrySuggestionsError): string {
  if (errorKind === 'unavailable') return LOG_COPY.nameSuggestNotAvailable;
  if (errorKind === 'network') return LOG_COPY.nameSuggestLoadError;
  return LOG_COPY.nameSuggestLoadError;
}
