/**
 * Tests for demo mode store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useDemoStore } from './demo';

describe('useDemoStore', () => {
  beforeEach(() => {
    // Reset to default state
    act(() => {
      useDemoStore.setState({ isDemoMode: false });
    });
  });

  afterEach(() => {
    act(() => {
      useDemoStore.setState({ isDemoMode: false });
    });
  });

  describe('initial state', () => {
    it('should have isDemoMode set to false by default', () => {
      const state = useDemoStore.getState();
      expect(state.isDemoMode).toBe(false);
    });
  });

  describe('setDemoMode', () => {
    it('should enable demo mode', () => {
      act(() => {
        useDemoStore.getState().setDemoMode(true);
      });

      expect(useDemoStore.getState().isDemoMode).toBe(true);
    });

    it('should disable demo mode', () => {
      // First enable it
      act(() => {
        useDemoStore.getState().setDemoMode(true);
      });

      expect(useDemoStore.getState().isDemoMode).toBe(true);

      // Then disable it
      act(() => {
        useDemoStore.getState().setDemoMode(false);
      });

      expect(useDemoStore.getState().isDemoMode).toBe(false);
    });

    it('should handle multiple toggles', () => {
      const store = useDemoStore.getState();

      act(() => {
        store.setDemoMode(true);
      });
      expect(useDemoStore.getState().isDemoMode).toBe(true);

      act(() => {
        store.setDemoMode(false);
      });
      expect(useDemoStore.getState().isDemoMode).toBe(false);

      act(() => {
        store.setDemoMode(true);
      });
      expect(useDemoStore.getState().isDemoMode).toBe(true);
    });
  });
});
