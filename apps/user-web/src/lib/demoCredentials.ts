export function getDemoCredentials(): { email: string; password: string } | null {
  const email = import.meta.env.VITE_DEMO_EMAIL ?? import.meta.env.VITE_DEV_EMAIL;
  const password = import.meta.env.VITE_DEMO_PASSWORD ?? import.meta.env.VITE_DEV_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function demoAutoLoginEnabled(): boolean {
  return getDemoCredentials() != null;
}
