import type { NavigationState, PartialState } from '@react-navigation/native';

type NavState = NavigationState | PartialState<NavigationState> | undefined;

/** Nested stack/tab — active leaf route name only (no params). */
export function getActiveRouteName(state: NavState): string | undefined {
  if (!state?.routes?.length) return undefined;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return undefined;
  const nested = route.state as NavState;
  if (nested?.routes?.length) return getActiveRouteName(nested);
  return route.name;
}
