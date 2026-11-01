import { describe, it, expect } from 'vitest'

import {
  parseOccupationFromActiveParty,
  parseOccupationsFromActiveParty,
  deriveAssociationCodeFromName,
} from './parseOccupations'

import type { AttributeValue } from './active-party-parser'

describe('parseOccupations', () => {
  describe('parseOccupationFromActiveParty', () => {
    it('should parse referee role with association code from inflatedValue', () => {
      const attr: AttributeValue = {
        __identity: 'attr-123',
        attributeIdentifier: 'memberOfAssociation',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
        value: 'assoc-uuid-123',
        inflatedValue: {
          __identity: 'assoc-uuid-123',
          name: 'Schiedsrichterverband Zentralschweiz',
          shortName: 'SVRZ',
          identifier: '912000',
          originId: 12,
        },
      }

      const result = parseOccupationFromActiveParty(attr)

      expect(result).toEqual({
        id: 'attr-123',
        type: 'referee',
        associationCode: 'SVRZ',
      })
    })

    it('should parse referee role without inflatedValue', () => {
      const attr: AttributeValue = {
        __identity: 'attr-123',
        attributeIdentifier: 'memberOfAssociation',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
      }

      const result = parseOccupationFromActiveParty(attr)

      expect(result).toEqual({
        id: 'attr-123',
        type: 'referee',
        associationCode: undefined,
      })
    })

    it('should filter out player role', () => {
      const attr: AttributeValue = {
        __identity: 'attr-123',
        attributeIdentifier: 'isPlayer',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Player',
        type: 'boolean',
      }

      const result = parseOccupationFromActiveParty(attr)

      expect(result).toBeNull()
    })

    it('should return null for missing roleIdentifier', () => {
      const attr = {
        __identity: 'attr-123',
        attributeIdentifier: 'memberOfAssociation',
      } as AttributeValue

      const result = parseOccupationFromActiveParty(attr)

      expect(result).toBeNull()
    })

    it('should return null for missing __identity', () => {
      const attr = {
        attributeIdentifier: 'memberOfAssociation',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
      } as AttributeValue

      const result = parseOccupationFromActiveParty(attr)

      expect(result).toBeNull()
    })
  })

  describe('parseOccupationsFromActiveParty', () => {
    it('should parse multiple referee occupations with association codes', () => {
      const attrs: AttributeValue[] = [
        {
          __identity: 'attr-1',
          attributeIdentifier: 'memberOfAssociation',
          roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
          inflatedValue: {
            __identity: 'assoc-1',
            shortName: 'SVRZ',
          },
        },
        {
          __identity: 'attr-2',
          attributeIdentifier: 'memberOfAssociation',
          roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
          inflatedValue: {
            __identity: 'assoc-2',
            shortName: 'SV',
          },
        },
      ]

      const result = parseOccupationsFromActiveParty(attrs)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 'attr-1', type: 'referee', associationCode: 'SVRZ' })
      expect(result[1]).toEqual({ id: 'attr-2', type: 'referee', associationCode: 'SV' })
    })

    it('should filter out non-referee roles', () => {
      const attrs: AttributeValue[] = [
        {
          __identity: 'attr-1',
          attributeIdentifier: 'memberOfAssociation',
          roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
          inflatedValue: { __identity: 'assoc-1', shortName: 'SV' },
        },
        {
          __identity: 'attr-2',
          attributeIdentifier: 'isPlayer',
          roleIdentifier: 'Indoorvolleyball.RefAdmin:Player',
          type: 'boolean',
        },
      ]

      const result = parseOccupationsFromActiveParty(attrs)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ id: 'attr-1', type: 'referee', associationCode: 'SV' })
    })

    it('should return empty array for null input', () => {
      const result = parseOccupationsFromActiveParty(null)

      expect(result).toEqual([])
    })

    it('should return empty array for undefined input', () => {
      const result = parseOccupationsFromActiveParty(undefined)

      expect(result).toEqual([])
    })

    it('should return empty array for empty array input', () => {
      const result = parseOccupationsFromActiveParty([])

      expect(result).toEqual([])
    })

    it('should derive association code from name when shortName is missing', () => {
      const attrs: AttributeValue[] = [
        {
          __identity: 'attr-1',
          attributeIdentifier: 'memberOfAssociation',
          roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
          inflatedValue: {
            __identity: 'assoc-1',
            name: 'Swiss Volley Région Zurich',
            // shortName is missing
          },
        },
      ]

      const result = parseOccupationsFromActiveParty(attrs)

      expect(result).toHaveLength(1)
      expect(result[0]?.associationCode).toBe('SVRZ')
    })

    it('should prefer shortName over derived name', () => {
      const attrs: AttributeValue[] = [
        {
          __identity: 'attr-1',
          attributeIdentifier: 'memberOfAssociation',
          roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
          inflatedValue: {
            __identity: 'assoc-1',
            name: 'Swiss Volley Région Zurich',
            shortName: 'CUSTOM',
          },
        },
      ]

      const result = parseOccupationsFromActiveParty(attrs)

      expect(result).toHaveLength(1)
      expect(result[0]?.associationCode).toBe('CUSTOM')
    })
  })

  describe('deriveAssociationCodeFromName', () => {
    it('should extract initials from Swiss Volley', () => {
      expect(deriveAssociationCodeFromName('Swiss Volley')).toBe('SV')
    })

    it('should extract initials from Swiss Volley Région Zurich', () => {
      expect(deriveAssociationCodeFromName('Swiss Volley Région Zurich')).toBe('SVRZ')
    })

    it('should exclude common prepositions', () => {
      expect(deriveAssociationCodeFromName('Association Vaudoise de Volleyball')).toBe('AVV')
    })

    it('should exclude French articles', () => {
      expect(deriveAssociationCodeFromName('Fédération de la Région')).toBe('FR')
    })

    it('should exclude German articles', () => {
      expect(deriveAssociationCodeFromName('Verband und Region')).toBe('VR')
    })

    it('should return undefined for empty string', () => {
      expect(deriveAssociationCodeFromName('')).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      expect(deriveAssociationCodeFromName(undefined)).toBeUndefined()
    })

    it('should return undefined if all words are excluded', () => {
      expect(deriveAssociationCodeFromName('de la le')).toBeUndefined()
    })

    it('should handle single word', () => {
      expect(deriveAssociationCodeFromName('Volleyball')).toBe('V')
    })
  })
})
