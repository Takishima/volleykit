import { describe, it, expect } from 'vitest';
import {
  parseGameSheet,
  parseGameSheetWithOCR,
  parsePlayerName,
  parseOfficialName,
  normalizeName,
  getAllPlayers,
  getAllOfficials,
} from './player-list-parser';
import type { OCRResult, OCRLine, OCRWord } from '../types';

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

describe('single-column overflow handling', () => {
  it('assigns single-column player rows to Team B after two-column rows', () => {
    // Team A has 2 players, Team B has 4 players
    // After row 2, Team A column ends and remaining rows are Team B only
    const ocrText = `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tPLAYER A1\tLFP\t1\tPLAYER B1\tLFP
2\tPLAYER A2\tLFP\t2\tPLAYER B2\tLFP
3\tPLAYER B3\tLFP
4\tPLAYER B4\tLFP`;

    const result = parseGameSheet(ocrText);

    // Team A should have exactly 2 players
    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamA.players.map((p) => p.rawName)).toEqual(['PLAYER A1', 'PLAYER A2']);

    // Team B should have 4 players (2 from two-column + 2 from single-column overflow)
    expect(result.teamB.players).toHaveLength(4);
    expect(result.teamB.players.map((p) => p.rawName)).toEqual([
      'PLAYER B1',
      'PLAYER B2',
      'PLAYER B3',
      'PLAYER B4',
    ]);
  });

  it('assigns single-column libero rows to Team B after two-column rows', () => {
    const ocrText = `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tPLAYER A1\tLFP\t1\tPLAYER B1\tLFP
LIBERO
L1 10\tLIBERO A1\tLFP\tL1 20\tLIBERO B1\tLFP
L2 21\tLIBERO B2\tLFP`;

    const result = parseGameSheet(ocrText);

    // Team A should have 1 player + 1 libero = 2 total
    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamA.players[1]!.rawName).toBe('LIBERO A1');
    expect(result.teamA.players[1]!.shirtNumber).toBe(10);

    // Team B should have 1 player + 2 liberos = 3 total
    expect(result.teamB.players).toHaveLength(3);
    expect(result.teamB.players[1]!.rawName).toBe('LIBERO B1');
    expect(result.teamB.players[1]!.shirtNumber).toBe(20);
    expect(result.teamB.players[2]!.rawName).toBe('LIBERO B2');
    expect(result.teamB.players[2]!.shirtNumber).toBe(21);
  });

  it('handles libero marker with number format (L1 7)', () => {
    const ocrText = `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
5\tPLAYER ONE\tLFP\t3\tPLAYER TWO\tLFP
LIBERO
L1 1\tZOLLER MILENA\tLFP\tL1 7\tMARZOCCHELLA ASIA\tLFP`;

    const result = parseGameSheet(ocrText);

    // Verify libero shirt numbers are correctly extracted from marker
    const teamALibero = result.teamA.players.find((p) => p.rawName === 'ZOLLER MILENA');
    expect(teamALibero).toBeDefined();
    expect(teamALibero!.shirtNumber).toBe(1);

    const teamBLibero = result.teamB.players.find((p) => p.rawName === 'MARZOCCHELLA ASIA');
    expect(teamBLibero).toBeDefined();
    expect(teamBLibero!.shirtNumber).toBe(7);
  });

  it('handles real-world electronic scoresheet format', () => {
    // Based on actual OCR output from electronic scoresheet
    const ocrText = `A Auswahlmannschaft Swiss Volley\tVBC Sursee B
N.\tName of the player\tN.\tName of the player
5\tGLUR RAFAEL\tLFP\t1\tBUCHER JIM\tLFP
8\tPETER JULIAN\tLFP\t2\tBAUMGARTNER JAN ELIAS\tLFP
9\tGANASSI LORIS\tLFP\t3\tCHRISTEN KAY\tLFP
11\tSCHWOTZER EMILE\tLFP\t4\tIVORRA AXEL\tNOT
15\tDIALLO MARCO BAMBA\tLFP\t5\tSTUDER SIRO LIVIO\tLFP
16\tJAKOUBI BASTIAN\tNOT\t7\tHOFER NOE\tLFP
17\tHOMBURG RUBEN\tLFP\t8\tAMREIN TIM PIRMIN\tLFP
18\tBARTHOLET LUKAS\tLFP\t9\tPETER LOIC\tLFP
10\tWYMANN LUKAS\tLFP
14\tKYBURZ FABIAN\tLFP
18\tSCHMID DARIO RAFFAEL\tLFP
LIBERO
L 12\tGERBER JOAN\tLFP\tL1 6\tOTTO-KOVACS VILMOS\tLFP
L2 17\tMETZLER NILS MATTIA\tLFP
OFFICIAL MEMBERS ADMITTED ON THE BENCH
C\tFölmli Marco\tC\tJoller Philipp`;

    const result = parseGameSheet(ocrText);

    // Team A should have 8 players + 1 libero
    expect(result.teamA.players).toHaveLength(9);

    // Team B should have 11 players (8 from two-column + 3 from overflow) + 2 liberos
    expect(result.teamB.players).toHaveLength(13);

    // Verify overflow players are in Team B
    expect(result.teamB.players.some((p) => p.rawName === 'WYMANN LUKAS')).toBe(true);
    expect(result.teamB.players.some((p) => p.rawName === 'KYBURZ FABIAN')).toBe(true);
    expect(result.teamB.players.some((p) => p.rawName === 'SCHMID DARIO RAFFAEL')).toBe(true);

    // Verify overflow liberos are in Team B
    expect(result.teamB.players.some((p) => p.rawName === 'METZLER NILS MATTIA')).toBe(true);
  });
});

// =============================================================================
// Helper functions for creating OCR test data with bounding boxes
// =============================================================================

function createWord(text: string, x0: number, x1?: number): OCRWord {
  return {
    text,
    confidence: 95,
    bbox: { x0, y0: 0, x1: x1 ?? x0 + text.length * 10, y1: 20 },
  };
}

function createLine(text: string, words: OCRWord[]): OCRLine {
  return {
    text,
    confidence: 95,
    words,
  };
}

function createOCRResult(fullText: string, lines: OCRLine[]): OCRResult {
  const allWords: OCRWord[] = [];
  for (const line of lines) {
    allWords.push(...line.words);
  }
  return { fullText, lines, words: allWords };
}

describe('parseGameSheetWithOCR', () => {
  it('falls back to text-only parsing when no OCR lines provided', () => {
    const ocrResult: OCRResult = {
      fullText: `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tPLAYER ONE\tOK\t1\tPLAYER TWO\tOK`,
      lines: [],
      words: [],
    };

    const result = parseGameSheetWithOCR(ocrResult);

    expect(result.warnings.some((w) => w.includes('text-only parsing'))).toBe(true);
    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamB.players).toHaveLength(1);
  });

  it('uses bounding boxes to assign single-column overflow to correct team', () => {
    // Simulate OCR output where Team A has fewer players
    // Two-column rows have words at x=0-200 (Team A) and x=400-600 (Team B)
    // Single-column overflow rows have words at x=400-600 (Team B)
    const lines: OCRLine[] = [
      // Header
      createLine('Team A\tTeam B', [
        createWord('Team A', 0, 100),
        createWord('Team B', 400, 500),
      ]),
      // Column headers
      createLine('N.\tName of the player\tLicense\tN.\tName of the player\tLicense', [
        createWord('N.', 0, 20),
        createWord('Name of the player', 30, 150),
        createWord('License', 160, 200),
        createWord('N.', 400, 420),
        createWord('Name of the player', 430, 550),
        createWord('License', 560, 600),
      ]),
      // Two-column player row
      createLine('1\tPLAYER A1\tLFP\t1\tPLAYER B1\tLFP', [
        createWord('1', 0, 10),
        createWord('PLAYER A1', 30, 120),
        createWord('LFP', 160, 200),
        createWord('1', 400, 410),
        createWord('PLAYER B1', 430, 520),
        createWord('LFP', 560, 600),
      ]),
      // Two-column player row
      createLine('2\tPLAYER A2\tLFP\t2\tPLAYER B2\tLFP', [
        createWord('2', 0, 10),
        createWord('PLAYER A2', 30, 120),
        createWord('LFP', 160, 200),
        createWord('2', 400, 410),
        createWord('PLAYER B2', 430, 520),
        createWord('LFP', 560, 600),
      ]),
      // Single-column overflow - positioned in right column (Team B)
      createLine('3\tPLAYER B3\tLFP', [
        createWord('3', 400, 410),
        createWord('PLAYER B3', 430, 520),
        createWord('LFP', 560, 600),
      ]),
      // Another single-column overflow - positioned in right column (Team B)
      createLine('4\tPLAYER B4\tLFP', [
        createWord('4', 400, 410),
        createWord('PLAYER B4', 430, 520),
        createWord('LFP', 560, 600),
      ]),
    ];

    const fullText = lines.map((l) => l.text).join('\n');
    const ocrResult = createOCRResult(fullText, lines);

    const result = parseGameSheetWithOCR(ocrResult);

    // Team A should have exactly 2 players
    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamA.players.map((p) => p.rawName)).toEqual(['PLAYER A1', 'PLAYER A2']);

    // Team B should have 4 players (2 from two-column + 2 from overflow)
    expect(result.teamB.players).toHaveLength(4);
    expect(result.teamB.players.map((p) => p.rawName)).toEqual([
      'PLAYER B1',
      'PLAYER B2',
      'PLAYER B3',
      'PLAYER B4',
    ]);
  });

  it('assigns single-column overflow to Team A when positioned in left column', () => {
    // In this scenario, Team B has fewer players and Team A has overflow
    const lines: OCRLine[] = [
      createLine('Team A\tTeam B', [
        createWord('Team A', 0, 100),
        createWord('Team B', 400, 500),
      ]),
      createLine('N.\tName of the player\tLicense\tN.\tName of the player\tLicense', [
        createWord('N.', 0, 20),
        createWord('Name of the player', 30, 150),
        createWord('License', 160, 200),
        createWord('N.', 400, 420),
        createWord('Name of the player', 430, 550),
        createWord('License', 560, 600),
      ]),
      // Two-column row
      createLine('1\tPLAYER A1\tLFP\t1\tPLAYER B1\tLFP', [
        createWord('1', 0, 10),
        createWord('PLAYER A1', 30, 120),
        createWord('LFP', 160, 200),
        createWord('1', 400, 410),
        createWord('PLAYER B1', 430, 520),
        createWord('LFP', 560, 600),
      ]),
      // Single-column overflow - positioned in LEFT column (Team A)
      createLine('2\tPLAYER A2\tLFP', [
        createWord('2', 0, 10),
        createWord('PLAYER A2', 30, 120),
        createWord('LFP', 160, 200),
      ]),
      // Another single-column in left column (Team A)
      createLine('3\tPLAYER A3\tLFP', [
        createWord('3', 0, 10),
        createWord('PLAYER A3', 30, 120),
        createWord('LFP', 160, 200),
      ]),
    ];

    const fullText = lines.map((l) => l.text).join('\n');
    const ocrResult = createOCRResult(fullText, lines);

    const result = parseGameSheetWithOCR(ocrResult);

    // Team A should have 3 players (1 from two-column + 2 from single-column)
    expect(result.teamA.players).toHaveLength(3);
    expect(result.teamA.players.map((p) => p.rawName)).toEqual([
      'PLAYER A1',
      'PLAYER A2',
      'PLAYER A3',
    ]);

    // Team B should have 1 player
    expect(result.teamB.players).toHaveLength(1);
    expect(result.teamB.players[0]!.rawName).toBe('PLAYER B1');
  });

  it('handles libero overflow with bounding box column detection', () => {
    const lines: OCRLine[] = [
      createLine('Team A\tTeam B', [
        createWord('Team A', 0, 100),
        createWord('Team B', 400, 500),
      ]),
      createLine('N.\tName of the player\tLicense\tN.\tName of the player\tLicense', [
        createWord('N.', 0, 20),
        createWord('Name of the player', 30, 150),
        createWord('License', 160, 200),
        createWord('N.', 400, 420),
        createWord('Name of the player', 430, 550),
        createWord('License', 560, 600),
      ]),
      // Player rows
      createLine('1\tPLAYER A1\tLFP\t1\tPLAYER B1\tLFP', [
        createWord('1', 0, 10),
        createWord('PLAYER A1', 30, 120),
        createWord('LFP', 160, 200),
        createWord('1', 400, 410),
        createWord('PLAYER B1', 430, 520),
        createWord('LFP', 560, 600),
      ]),
      // Libero section header
      createLine('LIBERO', [createWord('LIBERO', 200, 280)]),
      // Two-column libero row
      createLine('L1 10\tLIBERO A1\tLFP\tL1 20\tLIBERO B1\tLFP', [
        createWord('L1 10', 0, 40),
        createWord('LIBERO A1', 50, 140),
        createWord('LFP', 160, 200),
        createWord('L1 20', 400, 440),
        createWord('LIBERO B1', 450, 540),
        createWord('LFP', 560, 600),
      ]),
      // Single-column libero overflow - positioned in right column (Team B)
      createLine('L2 21\tLIBERO B2\tLFP', [
        createWord('L2 21', 400, 440),
        createWord('LIBERO B2', 450, 540),
        createWord('LFP', 560, 600),
      ]),
    ];

    const fullText = lines.map((l) => l.text).join('\n');
    const ocrResult = createOCRResult(fullText, lines);

    const result = parseGameSheetWithOCR(ocrResult);

    // Team A: 1 player + 1 libero = 2
    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamA.players[1]!.rawName).toBe('LIBERO A1');
    expect(result.teamA.players[1]!.shirtNumber).toBe(10);

    // Team B: 1 player + 2 liberos = 3
    expect(result.teamB.players).toHaveLength(3);
    expect(result.teamB.players[1]!.rawName).toBe('LIBERO B1');
    expect(result.teamB.players[1]!.shirtNumber).toBe(20);
    expect(result.teamB.players[2]!.rawName).toBe('LIBERO B2');
    expect(result.teamB.players[2]!.shirtNumber).toBe(21);
  });

  it('adds warning when column boundaries cannot be determined', () => {
    // Only single-column data - cannot determine column boundaries
    const lines: OCRLine[] = [
      createLine('Team A\tTeam B', [
        createWord('Team A', 0, 100),
        createWord('Team B', 200, 300),
      ]),
      createLine('N.\tName of the player\tLicense', [
        createWord('N.', 0, 20),
        createWord('Name of the player', 30, 150),
        createWord('License', 160, 200),
      ]),
      createLine('1\tPLAYER ONE\tLFP', [
        createWord('1', 0, 10),
        createWord('PLAYER ONE', 30, 120),
        createWord('LFP', 160, 200),
      ]),
    ];

    const fullText = lines.map((l) => l.text).join('\n');
    const ocrResult = createOCRResult(fullText, lines);

    const result = parseGameSheetWithOCR(ocrResult);

    // Should have a warning about column boundary detection
    expect(result.warnings.some((w) => w.includes('column boundaries'))).toBe(true);
  });
});
