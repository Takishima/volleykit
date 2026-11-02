import { describe, it, expect } from 'vitest'

import {
  API_CACHE_NAME,
  API_RESPONSE_CACHE_NAMES,
  PROXY_API_CACHE_NAME,
  buildCacheableApiUrlPattern,
} from './sw-cache-config'

const PROXY = 'https://api.volleykit.ch'
const DIRECT = 'https://volleymanager.volleyball.ch'

const proxyPattern = buildCacheableApiUrlPattern(PROXY)
const directPattern = buildCacheableApiUrlPattern(DIRECT, true)

/** Real request paths from docs/api and src/api/real-api.ts */
const CACHEABLE_PATHS = [
  '/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations',
  '/indoorvolleyball.refadmin/api%5Cindoorreferee/getIndoorRefereeByActivePerson',
  '/indoorvolleyball.refadmin/api\\refereeabsence/search',
  '/sportmanager.indoorvolleyball/api%5cgame/showWithNestedObjects',
  '/sportmanager.core/api%5celasticsearchperson/search',
  '/sportmanager.resourcemanagement/api%5cpersistentresource/upload',
  '/sportmanager.security/api%5cparty/switchRoleAndAttribute',
  '/sportmanager.volleyball/api%5Cperson/showWithNestedObjects',
]

/** Pages and routes that carry session material or HTML and must never be cached */
const NON_CACHEABLE_PATHS = [
  '/login',
  '/logout',
  '/sportmanager.security/authentication/authenticate',
  '/sportmanager.volleyball/main/dashboard',
  '/_Resources/Persistent/abc/profile.jpg',
  '/version',
  '/health',
]

describe('buildCacheableApiUrlPattern', () => {
  it.each(CACHEABLE_PATHS)('caches proxied JSON API route %s', (path) => {
    expect(proxyPattern.test(`${PROXY}${path}`)).toBe(true)
  })

  it.each(NON_CACHEABLE_PATHS)('does not cache %s via the proxy', (path) => {
    expect(proxyPattern.test(`${PROXY}${path}`)).toBe(false)
  })

  it.each(CACHEABLE_PATHS)('caches direct access with /api/ prefix for %s', (path) => {
    expect(directPattern.test(`${DIRECT}/api${path}`)).toBe(true)
  })

  it.each(NON_CACHEABLE_PATHS)('does not cache direct access to %s', (path) => {
    expect(directPattern.test(`${DIRECT}${path}`)).toBe(false)
  })

  it('does not match another host that merely contains the API path', () => {
    expect(proxyPattern.test(`https://evil.example/${PROXY}${CACHEABLE_PATHS[0]}`)).toBe(false)
  })

  it('does not accept the /api/ prefix on the proxy origin', () => {
    expect(proxyPattern.test(`${PROXY}/api${CACHEABLE_PATHS[0]}`)).toBe(false)
  })

  it('reduces a full endpoint URL to its origin', () => {
    const pattern = buildCacheableApiUrlPattern(`${PROXY}/ocr`)
    expect(pattern.test(`${PROXY}${CACHEABLE_PATHS[0]}`)).toBe(true)
  })
})

describe('cache names', () => {
  it('lists every runtime cache exactly once', () => {
    expect(API_RESPONSE_CACHE_NAMES).toEqual([API_CACHE_NAME, PROXY_API_CACHE_NAME])
    expect(new Set(API_RESPONSE_CACHE_NAMES).size).toBe(API_RESPONSE_CACHE_NAMES.length)
  })
})
