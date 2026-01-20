import { formatDate } from './date';

describe('formatDate', () => {
  describe('with valid dates', () => {
    it('formats date with default German locale', () => {
      const result = formatDate('2026-01-20T14:00:00.000+01:00');
      expect(result).toBe('20.01.2026');
    });

    it('formats date with explicit German locale', () => {
      const result = formatDate('2026-03-15T10:30:00.000+01:00', 'de');
      expect(result).toBe('15.03.2026');
    });

    it('formats date with English locale', () => {
      const result = formatDate('2026-03-15T10:30:00.000+00:00', 'en');
      expect(result).toBe('15/03/2026');
    });

    it('formats date with French locale (Swiss)', () => {
      const result = formatDate('2026-03-15T10:30:00.000+01:00', 'fr');
      // Swiss French uses periods as separators
      expect(result).toBe('15.03.2026');
    });

    it('formats date with Italian locale (Swiss)', () => {
      const result = formatDate('2026-03-15T10:30:00.000+01:00', 'it');
      // Swiss Italian uses periods as separators
      expect(result).toBe('15.03.2026');
    });
  });

  describe('with null or undefined input', () => {
    it('returns empty string for null', () => {
      const result = formatDate(null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = formatDate(undefined);
      expect(result).toBe('');
    });

    it('returns empty string for empty string', () => {
      const result = formatDate('');
      expect(result).toBe('');
    });
  });

  describe('with unknown locale', () => {
    it('falls back to German locale for unknown locale codes', () => {
      const result = formatDate('2026-01-20T14:00:00.000+01:00', 'unknown');
      expect(result).toBe('20.01.2026');
    });
  });

  describe('edge cases', () => {
    it('handles date at midnight UTC', () => {
      const result = formatDate('2026-12-31T00:00:00.000Z', 'de');
      // Note: Result depends on timezone, but format should be consistent
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it('handles ISO date without timezone', () => {
      const result = formatDate('2026-06-15', 'de');
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });
  });
});
