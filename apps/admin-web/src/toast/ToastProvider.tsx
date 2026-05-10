import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastInput = {
  kind: ToastKind;
  message: string;
};

export type ToastApi = {
  show: (input: ToastInput) => void;
  hide: (id?: number) => void;
};

type Internal = {
  id: number;
  kind: ToastKind;
  message: string;
  leaving: boolean;
};

const DURATION_MS: Record<ToastKind, number> = {
  success: 3500,
  info: 3500,
  error: 5000,
};

const ICON: Record<ToastKind, string> = {
  success: '✓',
  error: '✕',
  info: 'ⓘ',
};

const FADE_MS = 200;
const STACK_MAX = 3;

export const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Internal[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const leavingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: number) => {
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const removeNow = useCallback((id: number) => {
    clearTimer(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
    const lt = leavingTimersRef.current.get(id);
    if (lt) {
      clearTimeout(lt);
      leavingTimersRef.current.delete(id);
    }
  }, [clearTimer]);

  const startLeaving = useCallback((id: number) => {
    clearTimer(id);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, leaving: true } : it)));
    const lt = setTimeout(() => removeNow(id), FADE_MS);
    leavingTimersRef.current.set(id, lt);
  }, [clearTimer, removeNow]);

  const show = useCallback((input: ToastInput) => {
    const id = ++idRef.current;
    const next: Internal = { id, kind: input.kind, message: input.message, leaving: false };
    setItems((prev) => {
      const overflow = prev.length + 1 - STACK_MAX;
      if (overflow > 0) {
        // 가장 오래된 항목 즉시 dismiss
        const oldest = prev.slice(0, overflow);
        oldest.forEach((it) => {
          clearTimer(it.id);
        });
        return [...prev.slice(overflow), next];
      }
      return [...prev, next];
    });
    const tm = setTimeout(() => startLeaving(id), DURATION_MS[input.kind]);
    timersRef.current.set(id, tm);
  }, [clearTimer, startLeaving]);

  const hide = useCallback((id?: number) => {
    if (id === undefined) {
      items.forEach((it) => startLeaving(it.id));
      return;
    }
    startLeaving(id);
  }, [items, startLeaving]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((tm) => clearTimeout(tm));
      timersRef.current.clear();
      leavingTimersRef.current.forEach((tm) => clearTimeout(tm));
      leavingTimersRef.current.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {items.length > 0 ? (
        <div className="toast-stack" role="region" aria-label="알림">
          {items.map((it) => {
            const isError = it.kind === 'error';
            return (
              <div
                key={it.id}
                className={`toast-card toast-${it.kind}${it.leaving ? ' toast-leaving' : ''}`}
                role={isError ? 'alert' : 'status'}
                aria-live={isError ? 'assertive' : 'polite'}
              >
                <span className="toast-icon" aria-hidden="true">{ICON[it.kind]}</span>
                <span className="toast-message">{it.message}</span>
                <button
                  type="button"
                  className="toast-close"
                  aria-label="알림 닫기"
                  onClick={() => startLeaving(it.id)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
