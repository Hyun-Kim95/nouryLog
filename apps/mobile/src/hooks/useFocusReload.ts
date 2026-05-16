import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/** 탭 포커스마다 reload. 첫 포커스만 full loading, 이후는 silent. */
export function useFocusReload(reload: (opts: { silent: boolean }) => void | Promise<void>) {
  const firstFocus = useRef(true);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useFocusEffect(
    useCallback(() => {
      const silent = !firstFocus.current;
      firstFocus.current = false;
      void reloadRef.current({ silent });
    }, []),
  );
}
