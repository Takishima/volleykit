import { describe, it, expect } from 'vitest';
import {
  normalizeForComparison,
  calculateNameSimilarity,
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
