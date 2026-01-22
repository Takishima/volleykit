/**
 * Tests for network status utilities.
 *
 * Note: Hook tests require @testing-library/react-hooks which is not included.
 * These tests cover the pure utility functions.
 */

import NetInfo from '@react-native-community/netinfo';

import { checkNetworkStatus, isOnline } from './useNetworkStatus';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()),
}));

const mockedNetInfo = jest.mocked(NetInfo);

describe('checkNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns connected status for wifi', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as never);

    const status = await checkNetworkStatus();

    expect(status.isConnected).toBe(true);
    expect(status.isWifi).toBe(true);
    expect(status.isCellular).toBe(false);
    expect(status.type).toBe('wifi');
    expect(status.isKnown).toBe(true);
  });

  it('returns connected status for cellular', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'cellular',
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as never);

    const status = await checkNetworkStatus();

    expect(status.isConnected).toBe(true);
    expect(status.isWifi).toBe(false);
    expect(status.isCellular).toBe(true);
    expect(status.type).toBe('cellular');
  });

  it('returns disconnected status when not connected', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    } as never);

    const status = await checkNetworkStatus();

    expect(status.isConnected).toBe(false);
    expect(status.isWifi).toBe(false);
    expect(status.isCellular).toBe(false);
    expect(status.type).toBe('none');
  });

  it('handles null isConnected as connected (defensive)', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: null,
      isInternetReachable: null,
      details: null,
    } as never);

    const status = await checkNetworkStatus();

    // Default to connected when unknown
    expect(status.isConnected).toBe(true);
    expect(status.isKnown).toBe(false);
  });

  it('handles unknown connection types', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'unknown',
      isConnected: true,
      isInternetReachable: null,
      details: null,
    } as never);

    const status = await checkNetworkStatus();

    expect(status.isConnected).toBe(true);
    expect(status.isWifi).toBe(false);
    expect(status.isCellular).toBe(false);
    expect(status.type).toBe('unknown');
  });

  it('handles ethernet connection', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'ethernet',
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as never);

    const status = await checkNetworkStatus();

    expect(status.isConnected).toBe(true);
    expect(status.isWifi).toBe(false);
    expect(status.isCellular).toBe(false);
    expect(status.type).toBe('ethernet');
  });
});

describe('isOnline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when connected', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as never);

    const result = await isOnline();

    expect(result).toBe(true);
  });

  it('returns false when not connected', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    } as never);

    const result = await isOnline();

    expect(result).toBe(false);
  });

  it('returns true when connection state is unknown (defensive)', async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      type: 'unknown',
      isConnected: null,
      isInternetReachable: null,
      details: null,
    } as never);

    const result = await isOnline();

    // Default to online when unknown to avoid blocking the user
    expect(result).toBe(true);
  });
});
