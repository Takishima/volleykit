import { describe, it, expect } from 'vitest';
import {
  normalizeForComparison,
  calculateNameSimilarity,
  calculateWordOrderIndependentSimilarity,
  compareRosters,
  compareTeamRosters,
  calculateMatchScore,
} from './roster-comparison';
import type { ParsedPlayer } from '../types';
import type { RosterPlayerForComparison } from './roster-comparison';

describe('normalizeForComparison', () => {
  it('converts to lowercase', () => {
    expect(normalizeForComparison('MÜLLER')).toBe('muller');
  });

  it('removes accents', () => {
    expect(normalizeForComparison('Müller')).toBe('muller');
    expect(normalizeForComparison('François')).toBe('francois');
    expect(normalizeForComparison('Schröder')).toBe('schroder');
  });

  it('removes special characters', () => {
    expect(normalizeForComparison("O'Brien")).toBe('obrien');
  });

  it('handles empty strings', () => {
    expect(normalizeForComparison('')).toBe('');
  });

  it('normalizes whitespace', () => {
    expect(normalizeForComparison('Anna  Maria')).toBe('anna maria');
  });
});

describe('calculateNameSimilarity', () => {
  it('returns 100 for exact match', () => {
    expect(calculateNameSimilarity('Müller', 'Müller')).toBe(100);
    expect(calculateNameSimilarity('MÜLLER', 'müller')).toBe(100);
  });

  it('returns high score for contained names', () => {
    // 'Anna Maria' contains 'Anna Mar' (8/10 * 90 = 72)
    const score = calculateNameSimilarity('Anna Mar', 'Anna Maria');
    expect(score).toBeGreaterThan(70);
  });

  it('returns score for partial word match', () => {
    const score = calculateNameSimilarity('Anna Müller', 'Anna Weber');
    expect(score).toBeGreaterThan(40);
  });

  it('returns 0 for completely different names', () => {
    const score = calculateNameSimilarity('Xyz', 'Abc');
    expect(score).toBe(0);
  });

  it('returns 0 for empty strings', () => {
    expect(calculateNameSimilarity('', 'Anna')).toBe(0);
    expect(calculateNameSimilarity('Anna', '')).toBe(0);
  });
});

describe('calculateWordOrderIndependentSimilarity', () => {
  it('returns high score for exact match', () => {
    const score = calculateWordOrderIndependentSimilarity('Renée de Courten', 'Renée de Courten');
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('matches names with different word order', () => {
    // OCR: "De Courten Renée" vs Roster: "Renée de Courten"
    const score = calculateWordOrderIndependentSimilarity(
      'De Courten Renée',
      'Renée de Courten',
    );
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('matches names with extra middle names', () => {
    // OCR only has first name, roster has full name
    // "Renée" vs "Renée Sophie de Courten"
    const score = calculateWordOrderIndependentSimilarity('Renée', 'Renée Sophie de Courten');
    // 1 word matches out of 4 = 25% → 25% * 95 = ~24
    expect(score).toBeGreaterThan(20);
  });

  it('matches compound surnames with particles', () => {
    // Both have the same words, different order
    const score = calculateWordOrderIndependentSimilarity(
      'Courten Renée De',
      'Renée Sophie de Courten',
    );
    // 3 words match (renee, de, courten) out of 4 = 75% → ~71
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('handles nickname/partial matches (Timo vs Timothy)', () => {
    const score = calculateWordOrderIndependentSimilarity('Lippuner Timo', 'Timothy Lippuner');
    // "lippuner" matches exactly, "timo" partially matches "timothy" (prefix)
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('handles officials with reversed name format', () => {
    // OCR: "Rosa Geremia Giuliano" (Lastname Firstname format)
    // Roster: "Geremia Giuliano Rosa" (also reversed or different format)
    const score = calculateWordOrderIndependentSimilarity(
      'Rosa Geremia Giuliano',
      'Geremia Giuliano Rosa',
    );
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('handles accented characters', () => {
    const score = calculateWordOrderIndependentSimilarity(
      'FRÉCHELIN AURÉLIE',
      'Aurélie Fréchelin',
    );
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('returns 0 for completely different names', () => {
    const score = calculateWordOrderIndependentSimilarity('John Smith', 'Maria Garcia');
    expect(score).toBe(0);
  });

  it('returns 0 for empty strings', () => {
    expect(calculateWordOrderIndependentSimilarity('', 'Anna')).toBe(0);
    expect(calculateWordOrderIndependentSimilarity('Anna', '')).toBe(0);
  });
});

describe('compareRosters', () => {
  const createOCRPlayer = (
    firstName: string,
    lastName: string,
  ): ParsedPlayer => ({
    shirtNumber: 1,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    rawName: `${lastName.toUpperCase()} ${firstName.toUpperCase()}`,
    licenseStatus: 'OK',
  });

  const createRosterPlayer = (
    id: string,
    firstName: string,
    lastName: string,
  ): RosterPlayerForComparison => ({
    id,
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
  });

  it('matches identical players', () => {
    const ocrPlayers = [createOCRPlayer('Anna', 'Müller')];
    const rosterPlayers = [createRosterPlayer('1', 'Anna', 'Müller')];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('match');
    expect(results[0]!.confidence).toBe(100);
    expect(results[0]!.rosterPlayerId).toBe('1');
  });

  it('matches players with accent differences', () => {
    const ocrPlayers = [createOCRPlayer('Anna', 'Muller')];
    const rosterPlayers = [createRosterPlayer('1', 'Anna', 'Müller')];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    expect(results[0]!.status).toBe('match');
    expect(results[0]!.confidence).toBe(100);
  });

  it('identifies OCR-only players', () => {
    const ocrPlayers = [createOCRPlayer('Anna', 'Müller')];
    const rosterPlayers: RosterPlayerForComparison[] = [];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('ocr-only');
    expect(results[0]!.rosterPlayerId).toBeNull();
  });

  it('identifies roster-only players', () => {
    const ocrPlayers: ParsedPlayer[] = [];
    const rosterPlayers = [createRosterPlayer('1', 'Anna', 'Müller')];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('roster-only');
    expect(results[0]!.ocrPlayer).toBeNull();
  });

  it('matches multiple players correctly', () => {
    const ocrPlayers = [
      createOCRPlayer('Anna', 'Müller'),
      createOCRPlayer('Lisa', 'Schmidt'),
    ];
    const rosterPlayers = [
      createRosterPlayer('1', 'Anna', 'Müller'),
      createRosterPlayer('2', 'Lisa', 'Schmidt'),
      createRosterPlayer('3', 'Marie', 'Weber'),
    ];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    expect(results.filter((r) => r.status === 'match')).toHaveLength(2);
    expect(results.filter((r) => r.status === 'roster-only')).toHaveLength(1);
  });

  it('sorts results by status (match, ocr-only, roster-only)', () => {
    const ocrPlayers = [
      createOCRPlayer('Anna', 'Müller'),
      createOCRPlayer('Unknown', 'Player'),
    ];
    const rosterPlayers = [
      createRosterPlayer('1', 'Anna', 'Müller'),
      createRosterPlayer('2', 'Missing', 'Person'),
    ];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    expect(results[0]!.status).toBe('match');
    expect(results[1]!.status).toBe('ocr-only');
    expect(results[2]!.status).toBe('roster-only');
  });

  it('does not match the same roster player twice', () => {
    const ocrPlayers = [
      createOCRPlayer('Anna', 'Müller'),
      createOCRPlayer('Anna', 'Muller'), // Similar name
    ];
    const rosterPlayers = [createRosterPlayer('1', 'Anna', 'Müller')];

    const results = compareRosters(ocrPlayers, rosterPlayers);

    const matches = results.filter((r) => r.status === 'match');
    expect(matches).toHaveLength(1);
  });

  // Real-world OCR matching scenarios
  describe('word-order-independent matching', () => {
    it('matches compound surnames with particles (De Courten)', () => {
      // OCR parses "DE COURTEN RENÉE" as lastName="De", firstName="Courten Renée"
      // Roster has firstName="Renée Sophie", lastName="de Courten"
      const ocrPlayers = [createOCRPlayer('Courten Renée', 'De')];
      const rosterPlayers = [createRosterPlayer('1', 'Renée Sophie', 'de Courten')];

      const results = compareRosters(ocrPlayers, rosterPlayers);

      expect(results[0]!.status).toBe('match');
      expect(results[0]!.confidence).toBeGreaterThanOrEqual(70);
    });

    it('matches officials with reversed name format (Lastname Firstname)', () => {
      // OCR: "Lippuner Timo" parsed as lastName="Timo", firstName="Lippuner" (wrong)
      // Roster: firstName="Timothy", lastName="Lippuner"
      // Word-order-independent should still match "Lippuner" + partial "Timo/Timothy"
      const ocrPlayers = [createOCRPlayer('Lippuner', 'Timo')];
      const rosterPlayers = [createRosterPlayer('1', 'Timothy', 'Lippuner')];

      const results = compareRosters(ocrPlayers, rosterPlayers);

      expect(results[0]!.status).toBe('match');
      expect(results[0]!.confidence).toBeGreaterThanOrEqual(50);
    });

    it('matches three-part official names with reordering', () => {
      // OCR: "Rosa Geremia Giuliano" parsed incorrectly
      // Roster: "Geremia Giuliano Rosa"
      const ocrPlayers = [createOCRPlayer('Geremia Giuliano', 'Rosa')];
      const rosterPlayers = [createRosterPlayer('1', 'Geremia Giuliano', 'Rosa')];

      const results = compareRosters(ocrPlayers, rosterPlayers);

      expect(results[0]!.status).toBe('match');
      expect(results[0]!.confidence).toBeGreaterThanOrEqual(90);
    });

    it('does not match when OCR has only one partial name word', () => {
      // OCR only captures "RENÉE" but roster has "Renée Sophie de Courten"
      // 1 word out of 4 = 25% - below threshold, should NOT match to avoid false positives
      const ocrPlayers = [createOCRPlayer('', 'Renée')];
      const rosterPlayers = [createRosterPlayer('1', 'Renée Sophie', 'de Courten')];

      const results = compareRosters(ocrPlayers, rosterPlayers);

      // Should NOT match - too little information to be confident
      expect(results[0]!.status).toBe('ocr-only');
    });

    it('matches when OCR has partial name with last name', () => {
      // OCR captures "Renée de Courten" but roster has "Renée Sophie de Courten"
      // 3 words out of 4 match = 75% - above threshold
      const ocrPlayers = [createOCRPlayer('Renée', 'de Courten')];
      const rosterPlayers = [createRosterPlayer('1', 'Renée Sophie', 'de Courten')];

      const results = compareRosters(ocrPlayers, rosterPlayers);

      expect(results[0]!.status).toBe('match');
      expect(results[0]!.confidence).toBeGreaterThanOrEqual(70);
    });

    it('matches accented names from OCR', () => {
      // OCR: "FRÉCHELIN AURÉLIE" → firstName="Aurélie", lastName="Fréchelin"
      // Roster: firstName="Aurélie", lastName="Fréchelin"
      const ocrPlayers = [createOCRPlayer('Aurélie', 'Fréchelin')];
      const rosterPlayers = [createRosterPlayer('1', 'Aurélie', 'Fréchelin')];

      const results = compareRosters(ocrPlayers, rosterPlayers);

      expect(results[0]!.status).toBe('match');
      expect(results[0]!.confidence).toBe(100);
    });
  });
});

describe('compareTeamRosters', () => {
  it('returns complete comparison result', () => {
    const ocrPlayers: ParsedPlayer[] = [
      {
        shirtNumber: 1,
        firstName: 'Anna',
        lastName: 'Müller',
        displayName: 'Anna Müller',
        rawName: 'MÜLLER ANNA',
        licenseStatus: 'OK',
      },
    ];
    const rosterPlayers: RosterPlayerForComparison[] = [
      { id: '1', displayName: 'Anna Müller', firstName: 'Anna', lastName: 'Müller' },
    ];

    const result = compareTeamRosters(
      'OCR Team',
      ocrPlayers,
      'Roster Team',
      rosterPlayers,
    );

    expect(result.ocrTeamName).toBe('OCR Team');
    expect(result.rosterTeamName).toBe('Roster Team');
    expect(result.counts.matched).toBe(1);
    expect(result.counts.ocrOnly).toBe(0);
    expect(result.counts.rosterOnly).toBe(0);
  });
});

describe('calculateMatchScore', () => {
  it('returns 100 for all matched', () => {
    const result = {
      ocrTeamName: 'A',
      rosterTeamName: 'B',
      playerResults: [],
      counts: { matched: 6, ocrOnly: 0, rosterOnly: 0 },
    };

    expect(calculateMatchScore(result)).toBe(100);
  });

  it('returns 0 for no players', () => {
    const result = {
      ocrTeamName: 'A',
      rosterTeamName: 'B',
      playerResults: [],
      counts: { matched: 0, ocrOnly: 0, rosterOnly: 0 },
    };

    expect(calculateMatchScore(result)).toBe(0);
  });

  it('calculates correct percentage', () => {
    const result = {
      ocrTeamName: 'A',
      rosterTeamName: 'B',
      playerResults: [],
      counts: { matched: 3, ocrOnly: 1, rosterOnly: 2 },
    };

    expect(calculateMatchScore(result)).toBe(50); // 3/6 = 50%
  });
});
