import { describe, it, expect } from 'vitest'

import { generateDemoUuid } from './demo-uuid'

describe('generateDemoUuid', () => {
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('generates valid UUID v4 format', () => {
    const uuid = generateDemoUuid('test-seed')
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('generates deterministic UUIDs for the same seed', () => {
    const seed = 'consistent-seed'
    const uuid1 = generateDemoUuid(seed)
    const uuid2 = generateDemoUuid(seed)
    expect(uuid1).toBe(uuid2)
  })

  it('generates different UUIDs for different seeds', () => {
    const uuid1 = generateDemoUuid('seed-one')
    const uuid2 = generateDemoUuid('seed-two')
    expect(uuid1).not.toBe(uuid2)
  })

  it('handles empty string seed', () => {
    const uuid = generateDemoUuid('')
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('handles numeric string seeds', () => {
    const uuid = generateDemoUuid('12345')
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('handles special characters in seed', () => {
    const uuid = generateDemoUuid('test@#$%^&*()_+-=[]{}|;\':",./<>?')
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('handles unicode characters in seed', () => {
    const uuid = generateDemoUuid('test-überprüfung-测试')
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('handles long seed strings', () => {
    const longSeed = 'a'.repeat(1000)
    const uuid = generateDemoUuid(longSeed)
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('produces consistent results across multiple calls with various seeds', () => {
    const seeds = ['game-123', 'referee-456', 'assignment-789', 'match-abc']
    const results: Record<string, string> = {}

    // First pass: generate UUIDs
    for (const seed of seeds) {
      results[seed] = generateDemoUuid(seed)
    }

    // Second pass: verify they're all different and reproducible
    for (const seed of seeds) {
      expect(generateDemoUuid(seed)).toBe(results[seed])
      for (const otherSeed of seeds) {
        if (seed !== otherSeed) {
          expect(results[seed]).not.toBe(results[otherSeed])
        }
      }
    }
  })

  it('always has version 4 indicator at correct position', () => {
    const seeds = ['test1', 'test2', 'test3', 'another-seed', '']
    for (const seed of seeds) {
      const uuid = generateDemoUuid(seed)
      // Position 14 (0-indexed) should be '4'
      expect(uuid[14]).toBe('4')
    }
  })

  it('always has valid variant character at correct position', () => {
    const validVariants = ['8', '9', 'a', 'b']
    const seeds = ['test1', 'test2', 'test3', 'another-seed', '']
    for (const seed of seeds) {
      const uuid = generateDemoUuid(seed)
      // Position 19 (0-indexed) should be 8, 9, a, or b
      expect(validVariants).toContain(uuid[19])
    }
  })
})
