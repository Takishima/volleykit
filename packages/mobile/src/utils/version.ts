/**
 * App version utilities
 */

import Constants from 'expo-constants'

/**
 * Get the app version string from Expo config.
 * Includes build number (iOS) or version code (Android) when available.
 */
export function getAppVersion(): string {
  const version = Constants.expoConfig?.version ?? 'unknown'
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode?.toString()

  return buildNumber ? `${version} (${buildNumber})` : version
}
