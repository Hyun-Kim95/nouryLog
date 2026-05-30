import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { NavigationState } from '@react-navigation/native';
import { getActiveRouteName } from './navigationState';

describe('getActiveRouteName', () => {
  it('returns leaf route name in nested navigators', () => {
    const state = {
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            index: 1,
            routes: [{ name: 'Home' }, { name: 'Log' }],
          } as NavigationState,
        },
      ],
    } as NavigationState;
    assert.equal(getActiveRouteName(state), 'Log');
  });

  it('returns undefined for empty state', () => {
    assert.equal(getActiveRouteName(undefined), undefined);
  });
});
