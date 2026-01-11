import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getPositionLabel, type PositionKey } from './position-labels'

type PositionTranslationKey = `positions.${PositionKey}`

describe('position-labels', () => {
  const mockT = vi.fn((key: PositionTranslationKey): string => `translated:${key}`)

  beforeEach(() => {
    mockT.mockClear()
  })

  describe('getPositionLabel', () => {
    it.each<[PositionKey, string]>([
      ['head-one', 'positions.head-one'],
      ['head-two', 'positions.head-two'],
      ['linesman-one', 'positions.linesman-one'],
      ['linesman-two', 'positions.linesman-two'],
      ['linesman-three', 'positions.linesman-three'],
      ['linesman-four', 'positions.linesman-four'],
      ['standby-head', 'positions.standby-head'],
      ['standby-linesman', 'positions.standby-linesman'],
    ])("should translate known position '%s'", (positionKey, expectedKey) => {
      const result = getPositionLabel(positionKey, mockT)

      expect(mockT).toHaveBeenCalledWith(expectedKey)
      expect(result).toBe(`translated:${expectedKey}`)
    })

    it('should return raw position key for unknown positions', () => {
      const unknownPosition = 'unknown-position'

      const result = getPositionLabel(unknownPosition, mockT)

      expect(mockT).not.toHaveBeenCalled()
      expect(result).toBe(unknownPosition)
    })

    it('should return empty string when position is undefined and no fallback', () => {
      const result = getPositionLabel(undefined, mockT)

      expect(mockT).not.toHaveBeenCalled()
      expect(result).toBe('')
    })

    it('should return empty string when position is empty string and no fallback', () => {
      const result = getPositionLabel('', mockT)

      expect(mockT).not.toHaveBeenCalled()
      expect(result).toBe('')
    })

    it('should return fallback when position is undefined', () => {
      const fallback = 'Default Position'

      const result = getPositionLabel(undefined, mockT, fallback)

      expect(result).toBe(fallback)
    })

    it('should return fallback when position is empty string', () => {
      const fallback = 'Default Position'

      const result = getPositionLabel('', mockT, fallback)

      expect(result).toBe(fallback)
    })

    it('should not use fallback when position is a known key', () => {
      const fallback = 'Default Position'

      const result = getPositionLabel('head-one', mockT, fallback)

      expect(result).toBe('translated:positions.head-one')
    })

    it('should not use fallback when position is an unknown key', () => {
      const fallback = 'Default Position'

      const result = getPositionLabel('custom-position', mockT, fallback)

      expect(result).toBe('custom-position')
    })
  })
})
