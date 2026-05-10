import { useContext } from 'react';
import { ToastContext, type ToastApi } from './ToastProvider';

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {
        if (__DEV__) console.warn('[useToast] called outside ToastProvider');
      },
      hide: () => {},
    };
  }
  return ctx;
}
