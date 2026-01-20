/**
 * Tests for storage adapter
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  noopStorageAdapter,
  noopSecureStorageAdapter,
  StorageContext,
  useStorage,
  type StorageContextValue,
} from './storage';

describe('noopStorageAdapter', () => {
  it('should return null for getItem', async () => {
    const result = await noopStorageAdapter.getItem('any-key');
    expect(result).toBeNull();
  });

  it('should resolve setItem without error', async () => {
    await expect(noopStorageAdapter.setItem('key', 'value')).resolves.toBeUndefined();
  });

  it('should resolve removeItem without error', async () => {
    await expect(noopStorageAdapter.removeItem('key')).resolves.toBeUndefined();
  });
});

describe('noopSecureStorageAdapter', () => {
  it('should resolve setCredentials without error', async () => {
    await expect(
      noopSecureStorageAdapter.setCredentials('user', 'pass')
    ).resolves.toBeUndefined();
  });

  it('should return null for getCredentials', async () => {
    const result = await noopSecureStorageAdapter.getCredentials();
    expect(result).toBeNull();
  });

  it('should resolve clearCredentials without error', async () => {
    await expect(noopSecureStorageAdapter.clearCredentials()).resolves.toBeUndefined();
  });

  it('should return false for hasCredentials', async () => {
    const result = await noopSecureStorageAdapter.hasCredentials();
    expect(result).toBe(false);
  });
});

describe('StorageContext', () => {
  it('should have default noop adapters', () => {
    // Render a hook to access context default value
    const { result } = renderHook(() => useStorage());

    expect(result.current.storage).toBe(noopStorageAdapter);
    expect(result.current.secureStorage).toBe(noopSecureStorageAdapter);
  });

  it('should provide custom adapters via context', async () => {
    const mockStorage = {
      getItem: vi.fn().mockResolvedValue('stored-value'),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    };

    const mockSecureStorage = {
      setCredentials: vi.fn().mockResolvedValue(undefined),
      getCredentials: vi.fn().mockResolvedValue({ username: 'test', password: 'pass' }),
      clearCredentials: vi.fn().mockResolvedValue(undefined),
      hasCredentials: vi.fn().mockResolvedValue(true),
    };

    const customValue: StorageContextValue = {
      storage: mockStorage,
      secureStorage: mockSecureStorage,
    };

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StorageContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useStorage(), { wrapper });

    expect(result.current.storage).toBe(mockStorage);
    expect(result.current.secureStorage).toBe(mockSecureStorage);

    // Test that custom adapters work
    const storedValue = await result.current.storage.getItem('test-key');
    expect(storedValue).toBe('stored-value');
    expect(mockStorage.getItem).toHaveBeenCalledWith('test-key');

    const credentials = await result.current.secureStorage.getCredentials();
    expect(credentials).toEqual({ username: 'test', password: 'pass' });

    const hasCredentials = await result.current.secureStorage.hasCredentials();
    expect(hasCredentials).toBe(true);
  });
});

describe('useStorage', () => {
  it('should return storage adapters from context', () => {
    const { result } = renderHook(() => useStorage());

    expect(result.current).toHaveProperty('storage');
    expect(result.current).toHaveProperty('secureStorage');
    expect(typeof result.current.storage.getItem).toBe('function');
    expect(typeof result.current.storage.setItem).toBe('function');
    expect(typeof result.current.storage.removeItem).toBe('function');
    expect(typeof result.current.secureStorage.setCredentials).toBe('function');
    expect(typeof result.current.secureStorage.getCredentials).toBe('function');
    expect(typeof result.current.secureStorage.clearCredentials).toBe('function');
    expect(typeof result.current.secureStorage.hasCredentials).toBe('function');
  });
});

describe('integration', () => {
  it('should work with async/await patterns', async () => {
    const storage = noopStorageAdapter;

    // Should be able to chain operations
    await storage.setItem('key1', 'value1');
    const value = await storage.getItem('key1');
    expect(value).toBeNull(); // noop always returns null

    await storage.removeItem('key1');
    // No error thrown
  });

  it('should work with Promise.all for parallel operations', async () => {
    const storage = noopStorageAdapter;

    const results = await Promise.all([
      storage.getItem('key1'),
      storage.getItem('key2'),
      storage.getItem('key3'),
    ]);

    expect(results).toEqual([null, null, null]);
  });

  it('should handle secure storage flow', async () => {
    const secureStorage = noopSecureStorageAdapter;

    // Typical auth flow
    const hasCreds = await secureStorage.hasCredentials();
    expect(hasCreds).toBe(false);

    await secureStorage.setCredentials('user', 'pass');

    const creds = await secureStorage.getCredentials();
    expect(creds).toBeNull(); // noop doesn't actually store

    await secureStorage.clearCredentials();
    // No error
  });
});
