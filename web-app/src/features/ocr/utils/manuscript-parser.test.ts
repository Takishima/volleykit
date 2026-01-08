import { describe, it, expect } from 'vitest';
import {
  parseManuscriptSheet,
  correctDigits,
  correctLetters,
  extractShirtNumber,
  normalizeName,
  parsePlayerName,
  parseOfficialName,
} from './manuscript-parser';

describe('OCR Error Correction', () => {
  describe('correctDigits', () => {
    it('corrects O to 0', () => {
      expect(correctDigits('O')).toBe('0');
      expect(correctDigits('1O')).toBe('10');
    });

    it('corrects I/l to 1', () => {
      expect(correctDigits('I')).toBe('1');
      expect(correctDigits('l')).toBe('1');
      expect(correctDigits('Il')).toBe('11');
    });

    it('corrects S/s to 5', () => {
      expect(correctDigits('S')).toBe('5');
      expect(correctDigits('s')).toBe('5');
    });

    it('preserves valid digits', () => {
      expect(correctDigits('123')).toBe('123');
      expect(correctDigits('99')).toBe('99');
    });
  });

  describe('correctLetters', () => {
    it('corrects 0 to O', () => {
      expect(correctLetters('0')).toBe('O');
      expect(correctLetters('M0LLER')).toBe('MOLLER');
    });

    it('corrects 1 to I', () => {
      expect(correctLetters('1')).toBe('I');
    });

    it('corrects 5 to S', () => {
      expect(correctLetters('5CHMIDT')).toBe('SCHMIDT');
    });

    it('preserves valid letters', () => {
      expect(correctLetters('MÜLLER')).toBe('MÜLLER');
    });
  });

  describe('extractShirtNumber', () => {
    it('extracts valid numbers', () => {
      expect(extractShirtNumber('1')).toBe(1);
      expect(extractShirtNumber('12')).toBe(12);
      expect(extractShirtNumber('99')).toBe(99);
    });

    it('corrects OCR errors in numbers', () => {
      expect(extractShirtNumber('O1')).toBe(1); // O -> 0, but 01 -> 1
      expect(extractShirtNumber('l2')).toBe(12); // l -> 1
      expect(extractShirtNumber('I5')).toBe(15); // I -> 1
    });

    it('returns null for invalid numbers', () => {
      expect(extractShirtNumber('')).toBe(null);
      expect(extractShirtNumber('100')).toBe(null); // > 99
      expect(extractShirtNumber('abc')).toBe(null);
    });

    it('handles whitespace', () => {
      expect(extractShirtNumber('  12  ')).toBe(12);
    });
  });
});

describe('Name Parsing', () => {
  describe('normalizeName', () => {
    it('converts to title case', () => {
      expect(normalizeName('MÜLLER')).toBe('Müller');
      expect(normalizeName('anna maria')).toBe('Anna Maria');
    });

    it('handles empty strings', () => {
      expect(normalizeName('')).toBe('');
    });

    it('applies letter corrections', () => {
      expect(normalizeName('M0LLER')).toBe('Moller');
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
    });

    it('handles multiple first names', () => {
      const result = parsePlayerName('MÜLLER ANNA MARIA');
      expect(result.lastName).toBe('Müller');
      expect(result.firstName).toBe('Anna Maria');
    });

    it('handles empty input', () => {
      const result = parsePlayerName('');
      expect(result.lastName).toBe('');
      expect(result.firstName).toBe('');
    });
  });

  describe('parseOfficialName', () => {
    it('parses Firstname Lastname format', () => {
      const result = parseOfficialName('Hans Trainer');
      expect(result.firstName).toBe('Hans');
      expect(result.lastName).toBe('Trainer');
    });

    it('handles single name', () => {
      const result = parseOfficialName('Coach');
      expect(result.lastName).toBe('Coach');
      expect(result.firstName).toBe('');
    });
  });
});

describe('parseManuscriptSheet', () => {
  it('parses a basic manuscript scoresheet', () => {
    const ocrText = `Team A VBC Heimteam
1 MÜLLER ANNA
2 WEBER MARIE
3 SCHMIDT LISA

Team B VBC Gastteam
4 FISCHER JULIA
5 KOCH CLARA
6 BRUNNER LEA`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(3);
    expect(result.teamA.players[0]!.lastName).toBe('Müller');
    expect(result.teamA.players[0]!.firstName).toBe('Anna');
    expect(result.teamA.players[0]!.shirtNumber).toBe(1);

    expect(result.teamB.players).toHaveLength(3);
    expect(result.teamB.players[0]!.lastName).toBe('Fischer');
    expect(result.teamB.players[0]!.shirtNumber).toBe(4);
  });

  it('handles OCR errors in numbers', () => {
    const ocrText = `Team A
O1 MÜLLER ANNA
l2 WEBER MARIE`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamA.players[0]!.shirtNumber).toBe(1); // O1 -> 01 -> 1
    expect(result.teamA.players[1]!.shirtNumber).toBe(12); // l2 -> 12
  });

  it('handles various number-name separators', () => {
    const ocrText = `Team A
1. MÜLLER ANNA
2: WEBER MARIE
3 - SCHMIDT LISA`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(3);
    expect(result.teamA.players[0]!.lastName).toBe('Müller');
    expect(result.teamA.players[1]!.lastName).toBe('Weber');
    expect(result.teamA.players[2]!.lastName).toBe('Schmidt');
  });

  it('parses officials', () => {
    const ocrText = `Team A
1 MÜLLER ANNA
C Hans Trainer
AC Maria Assistentin`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamA.officials).toHaveLength(2);
    expect(result.teamA.officials[0]!.role).toBe('C');
    expect(result.teamA.officials[0]!.displayName).toBe('Hans Trainer');
    expect(result.teamA.officials[1]!.role).toBe('AC');
  });

  it('handles empty input', () => {
    const result = parseManuscriptSheet('');
    expect(result.warnings).toContain('No OCR text provided');
    expect(result.teamA.players).toHaveLength(0);
    expect(result.teamB.players).toHaveLength(0);
  });

  it('handles missing team B', () => {
    const ocrText = `Team A VBC Heimteam
1 MÜLLER ANNA
2 WEBER MARIE`;

    const result = parseManuscriptSheet(ocrText);
    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamB.players).toHaveLength(0);
  });

  it('detects HOME/AWAY team markers', () => {
    const ocrText = `HOME VBC Heim
1 MÜLLER ANNA

AWAY VBC Gast
2 FISCHER JULIA`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamA.players[0]!.lastName).toBe('Müller');
    expect(result.teamB.players).toHaveLength(1);
    expect(result.teamB.players[0]!.lastName).toBe('Fischer');
  });

  it('ignores libero markers but parses libero players', () => {
    const ocrText = `Team A
1 MÜLLER ANNA
LIBERO
2 BRUNNER LEA`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(2);
    expect(result.teamA.players[1]!.lastName).toBe('Brunner');
  });

  it('stops parsing at signature section', () => {
    const ocrText = `Team A
1 MÜLLER ANNA
SIGNATURES
Some signature text`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(1);
  });

  it('handles German team markers', () => {
    const ocrText = `MANNSCHAFT A VBC Zürich
1 MÜLLER ANNA

MANNSCHAFT B VBC Basel
2 WEBER MARIE`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamB.players).toHaveLength(1);
  });

  it('handles French team markers', () => {
    const ocrText = `ÉQUIPE A VBC Genève
1 MÜLLER ANNA

ÉQUIPE B VBC Lausanne
2 FISCHER JULIA`;

    const result = parseManuscriptSheet(ocrText);

    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamB.players).toHaveLength(1);
  });
});

describe('parseGameSheetWithType', () => {
  // Import at test time to avoid circular dependency issues
  it('routes to manuscript parser when type is manuscript', async () => {
    const { parseGameSheetWithType } = await import('./player-list-parser');

    const ocrText = `Team A VBC Test
1 MÜLLER ANNA`;

    const result = parseGameSheetWithType(ocrText, { type: 'manuscript' });

    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamA.players[0]!.lastName).toBe('Müller');
  });

  it('routes to electronic parser by default', async () => {
    const { parseGameSheetWithType } = await import('./player-list-parser');

    const ocrText = `VBC Heimteam\tVBC Gastteam
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK\t3\tSCHMIDT LISA\tOK`;

    const result = parseGameSheetWithType(ocrText);

    expect(result.teamA.players).toHaveLength(1);
    expect(result.teamA.players[0]!.lastName).toBe('Müller');
    expect(result.teamB.players).toHaveLength(1);
  });

  it('routes to electronic parser when type is electronic', async () => {
    const { parseGameSheetWithType } = await import('./player-list-parser');

    const ocrText = `VBC Heimteam\tVBC Gastteam
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK\t3\tSCHMIDT LISA\tOK`;

    const result = parseGameSheetWithType(ocrText, { type: 'electronic' });

    expect(result.teamA.name).toBe('VBC Heimteam');
    expect(result.teamB.name).toBe('VBC Gastteam');
  });
});
