import { describe, it, expect } from 'vitest';
import {
  parseGameSheet,
  parsePlayerName,
  parseOfficialName,
  normalizeName,
  getAllPlayers,
  getAllOfficials,
} from './player-list-parser';

describe('normalizeName', () => {
  it('converts uppercase to title case', () => {
    expect(normalizeName('MÜLLER')).toBe('Müller');
    expect(normalizeName('ANNA MARIA')).toBe('Anna Maria');
  });

  it('handles empty strings', () => {
    expect(normalizeName('')).toBe('');
  });

  it('handles hyphenated names', () => {
    expect(normalizeName('JEAN-PIERRE')).toBe('Jean Pierre');
  });
});

describe('parsePlayerName', () => {
  it('parses LASTNAME FIRSTNAME format', () => {
    const result = parsePlayerName('MÜLLER ANNA');
    expect(result.lastName).toBe('Müller');
    expect(result.firstName).toBe('Anna');
    expect(result.displayName).toBe('Anna Müller');
  });

  it('handles single name', () => {
    const result = parsePlayerName('MÜLLER');
    expect(result.lastName).toBe('Müller');
    expect(result.firstName).toBe('');
    expect(result.displayName).toBe('Müller');
  });

  it('handles multiple first names', () => {
    const result = parsePlayerName('MÜLLER ANNA MARIA');
    expect(result.lastName).toBe('Müller');
    expect(result.firstName).toBe('Anna Maria');
    expect(result.displayName).toBe('Anna Maria Müller');
  });

  it('handles empty input', () => {
    const result = parsePlayerName('');
    expect(result.lastName).toBe('');
    expect(result.firstName).toBe('');
    expect(result.displayName).toBe('');
  });
});

describe('parseOfficialName', () => {
  it('parses Firstname Lastname format', () => {
    const result = parseOfficialName('Hans Trainer');
    expect(result.firstName).toBe('Hans');
    expect(result.lastName).toBe('Trainer');
    expect(result.displayName).toBe('Hans Trainer');
  });

  it('handles single name', () => {
    const result = parseOfficialName('Trainer');
    expect(result.lastName).toBe('Trainer');
    expect(result.firstName).toBe('');
    expect(result.displayName).toBe('Trainer');
  });
});

describe('parseGameSheet', () => {
  it('parses a complete scoresheet', () => {
    const ocrText = `VBC Heimteam\tVBC Gastteam
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK\t3\tSCHMIDT LISA\tOK
4\tWEBER MARIE\tOK\t7\tFISCHER JULIA\tOK
LIBERO
L1\t2 BRUNNER LEA\tOK\tL1\t5 KOCH CLARA\tOK
OFFICIAL MEMBERS ADMITTED ON THE BENCH
C\tHans Trainer\tC\tPeter Coach`;

    const result = parseGameSheet(ocrText);

    // Team names
    expect(result.teamA.name).toBe('VBC Heimteam');
    expect(result.teamB.name).toBe('VBC Gastteam');

    // Team A players
    expect(result.teamA.players).toHaveLength(3); // 2 + 1 libero
    expect(result.teamA.players[0]!.lastName).toBe('Müller');
    expect(result.teamA.players[0]!.firstName).toBe('Anna');
    expect(result.teamA.players[0]!.shirtNumber).toBe(1);

    // Team B players
    expect(result.teamB.players).toHaveLength(3);
    expect(result.teamB.players[0]!.lastName).toBe('Schmidt');
    expect(result.teamB.players[0]!.firstName).toBe('Lisa');

    // Liberos are included
    expect(result.teamA.players[2]!.lastName).toBe('Brunner');
    expect(result.teamA.players[2]!.shirtNumber).toBe(2);

    // Officials
    expect(result.teamA.officials).toHaveLength(1);
    expect(result.teamA.officials[0]!.role).toBe('C');
    expect(result.teamA.officials[0]!.displayName).toBe('Hans Trainer');

    expect(result.teamB.officials).toHaveLength(1);
    expect(result.teamB.officials[0]!.role).toBe('C');
  });

  it('handles empty input', () => {
    const result = parseGameSheet('');
    expect(result.warnings).toContain('No OCR text provided');
    expect(result.teamA.players).toHaveLength(0);
    expect(result.teamB.players).toHaveLength(0);
  });

  it('handles missing team B', () => {
    // Tab-separated format with Team B name but no Team B players
    const ocrText = `VBC Heimteam\tVBC Gastteam
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK`;

    const result = parseGameSheet(ocrText);
    expect(result.teamA.players.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('Team B'))).toBe(true);
  });

  it('parses assistant coaches', () => {
    const ocrText = `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tPLAYER ONE\tOK\t1\tPLAYER TWO\tOK
OFFICIAL MEMBERS
C\tHead Coach\tC\tOther Coach
AC\tAssistant One\tAC\tAssistant Two`;

    const result = parseGameSheet(ocrText);
    expect(result.teamA.officials).toHaveLength(2);
    expect(result.teamA.officials[1]!.role).toBe('AC');
  });
});

describe('getAllPlayers', () => {
  it('returns all players from a team', () => {
    const ocrText = `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tPLAYER ONE\tOK\t1\tPLAYER TWO\tOK
2\tPLAYER THREE\tOK\t2\tPLAYER FOUR\tOK`;

    const result = parseGameSheet(ocrText);
    const players = getAllPlayers(result.teamA);
    expect(players).toHaveLength(2);
  });
});

describe('getAllOfficials', () => {
  it('returns all officials from a team', () => {
    const ocrText = `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tPLAYER ONE\tOK\t1\tPLAYER TWO\tOK
OFFICIAL MEMBERS
C\tHead Coach\tC\tOther Coach
AC\tAssistant\tAC\tOther Assistant`;

    const result = parseGameSheet(ocrText);
    const officials = getAllOfficials(result.teamA);
    expect(officials).toHaveLength(2);
  });
});
