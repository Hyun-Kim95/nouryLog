import { useEffect, useState } from 'react';

const KEY = 'diet-mock-theme';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(KEY) === 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
