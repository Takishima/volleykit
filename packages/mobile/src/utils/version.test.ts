import Constants from 'expo-constants';

import { getAppVersion } from './version';

jest.mock('expo-constants', () => ({
  expoConfig: null,
}));

describe('getAppVersion', () => {
  const mockConstants = Constants as { expoConfig: typeof Constants.expoConfig };

  beforeEach(() => {
    mockConstants.expoConfig = null;
  });

  it('returns version with iOS build number when available', () => {
    mockConstants.expoConfig = {
      version: '1.2.3',
      ios: { buildNumber: '42' },
    } as typeof Constants.expoConfig;

    expect(getAppVersion()).toBe('1.2.3 (42)');
  });

  it('returns version with Android versionCode when available', () => {
    mockConstants.expoConfig = {
      version: '1.2.3',
      android: { versionCode: 100 },
    } as typeof Constants.expoConfig;

    expect(getAppVersion()).toBe('1.2.3 (100)');
  });

  it('prefers iOS buildNumber over Android versionCode', () => {
    mockConstants.expoConfig = {
      version: '1.2.3',
      ios: { buildNumber: '42' },
      android: { versionCode: 100 },
    } as typeof Constants.expoConfig;

    expect(getAppVersion()).toBe('1.2.3 (42)');
  });

  it('returns version without build number when not available', () => {
    mockConstants.expoConfig = {
      version: '1.2.3',
    } as typeof Constants.expoConfig;

    expect(getAppVersion()).toBe('1.2.3');
  });

  it('returns "unknown" when version is missing', () => {
    mockConstants.expoConfig = {} as typeof Constants.expoConfig;

    expect(getAppVersion()).toBe('unknown');
  });

  it('returns "unknown" when expoConfig is null', () => {
    mockConstants.expoConfig = null;

    expect(getAppVersion()).toBe('unknown');
  });
});
