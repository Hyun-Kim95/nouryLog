import { useEffect, useState } from 'react';
import { ApiError, isAuthDenied, isRequestAborted } from '../api';
import { listNutritionFoods, type NutritionFoodItem } from '../api/nutritionFoods';
import { ensureAccessToken } from '../authSession';
import { LOG_COPY } from '../copy/log';
import { NUTRITION_FOOD_Q_MAX } from '../lib/nutritionFoodScale';
import { logAppError } from '../lib/userFacingError';

const DEBOUNCE_MS = 300;
const UI_LIMIT = 8;

export type NutritionFoodSearchStatus = 'idle' | 'loading' | 'success' | 'error' | 'q_too_long';

export function useNutritionFoodSearch(
  q: string,
  enabled: boolean,
): {
  items: NutritionFoodItem[];
  status: NutritionFoodSearchStatus;
  retry: () => void;
} {
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<NutritionFoodItem[]>([]);
  const [status, setStatus] = useState<NutritionFoodSearchStatus>('idle');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDebouncedQ('');
      setItems([]);
      setStatus('idle');
      return;
    }
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setDebouncedQ('');
      setItems([]);
      setStatus('idle');
      return;
    }
    if (trimmed.length > NUTRITION_FOOD_Q_MAX) {
      setDebouncedQ('');
      setItems([]);
      setStatus('q_too_long');
      return;
    }
    const timer = setTimeout(() => setDebouncedQ(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, enabled]);

  useEffect(() => {
    if (!enabled || debouncedQ.length < 1 || debouncedQ.length > NUTRITION_FOOD_Q_MAX) {
      return;
    }

    const controller = new AbortController();
    let stale = false;

    void (async () => {
      setStatus('loading');
      setItems([]);
      try {
        const token = await ensureAccessToken();
        if (!token) {
          if (stale) return;
          setItems([]);
          setStatus('error');
          return;
        }
        const res = await listNutritionFoods(token, {
          q: debouncedQ,
          page: 1,
          size: 15,
          signal: controller.signal,
        });
        if (stale) return;
        setItems((res.items ?? []).slice(0, UI_LIMIT));
        setStatus('success');
      } catch (e) {
        if (stale || isRequestAborted(e)) return;
        setItems([]);
        setStatus('error');
        if (__DEV__) {
          if (isAuthDenied(e)) {
            logAppError('[useNutritionFoodSearch] auth denied (silent)', e);
          } else if (e instanceof ApiError && e.status === 422) {
            logAppError('[useNutritionFoodSearch] validation', e);
          } else {
            logAppError('[useNutritionFoodSearch] failed', e);
          }
        }
      }
    })();

    return () => {
      stale = true;
      controller.abort();
    };
  }, [debouncedQ, enabled, retryToken]);

  return {
    items,
    status,
    retry: () => setRetryToken((n) => n + 1),
  };
}

export function nutritionFoodSearchStatusMessage(status: NutritionFoodSearchStatus): string {
  if (status === 'q_too_long') return LOG_COPY.nutritionDbQTooLong;
  if (status === 'error') return LOG_COPY.nutritionDbError;
  if (status === 'loading') return LOG_COPY.nameSuggestLoading;
  return LOG_COPY.nutritionDbEmpty;
}
