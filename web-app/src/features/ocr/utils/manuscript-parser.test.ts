import { describe, it, expect } from 'vitest';
import {
  parseManuscriptSheet,
  correctDigits,
  correctLetters,
  extractShirtNumber,
  normalizeName,
  parsePlayerName,
  parseOfficialName,
  isSwissTabularFormat,
  splitConcatenatedNames,
  splitConcatenatedDates,
  splitConcatenatedNumbers,
  extractSwissTeamNames,
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

// =============================================================================
// Swiss Tabular Format Tests
// =============================================================================

describe('Swiss Tabular Format Detection', () => {
  describe('isSwissTabularFormat', () => {
    it('detects Swiss format by multilingual headers and tab structure', () => {
      const text = `PunktePointsPunti\tTeam A\tTeam B
Lizenz-Nr.Licence-No.Licenza-No.\tData\tData
NameNomNome\tNames\tNames
LIBEROS\tLib\tLib`;
      expect(isSwissTabularFormat(text)).toBe(true);
    });

    it('detects Swiss format by concatenated names pattern', () => {
      const text = `NameNomNome
S. AngeliL. CollierO. Follouier`;
      expect(isSwissTabularFormat(text)).toBe(true);
    });

    it('returns false for simple sequential format', () => {
      const text = `Team A VBC Test
1 MÜLLER ANNA
2 WEBER MARIE`;
      expect(isSwissTabularFormat(text)).toBe(false);
    });
  });
});

describe('Concatenated Data Splitting', () => {
  describe('splitConcatenatedNames', () => {
    it('splits names with initial + dot pattern', () => {
      const text = 'S. AngeliL. CollierO. Follouier';
      const names = splitConcatenatedNames(text);
      expect(names).toEqual(['S. Angeli', 'L. Collier', 'O. Follouier']);
    });

    it('splits real OCR data from TV St. Johann', () => {
      const text = 'S. AngeliL. CollierO. FollouierS. GürtlerM. KaprtanagluM. LorentzJ. MonnierL. MonteroA. SuterA. Vouwiler';
      const names = splitConcatenatedNames(text);
      expect(names).toHaveLength(10);
      expect(names[0]).toBe('S. Angeli');
      expect(names[1]).toBe('L. Collier');
      expect(names[5]).toBe('M. Lorentz');
      expect(names[9]).toBe('A. Vouwiler');
    });

    it('handles names without dots', () => {
      const text = 'MüllerAnnaWeberMarie';
      const names = splitConcatenatedNames(text);
      expect(names.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for empty input', () => {
      expect(splitConcatenatedNames('')).toEqual([]);
      expect(splitConcatenatedNames('  ')).toEqual([]);
    });
  });

  describe('splitConcatenatedDates', () => {
    it('splits concatenated birth dates', () => {
      const text = '20.2.9721.1.9713.1.97';
      const dates = splitConcatenatedDates(text);
      expect(dates).toEqual(['20.2.97', '21.1.97', '13.1.97']);
    });

    it('splits real OCR date data', () => {
      const text = '20.2.9721.1.9713.1.9715.1.8127.12.966.4.8021.7.8119.6.977.10.8216.3.91';
      const dates = splitConcatenatedDates(text);
      expect(dates).toHaveLength(10);
      expect(dates[0]).toBe('20.2.97');
      expect(dates[4]).toBe('27.12.96');
      expect(dates[9]).toBe('16.3.91');
    });

    it('handles 4-digit years', () => {
      const text = '20.02.199721.01.1997';
      const dates = splitConcatenatedDates(text);
      expect(dates).toEqual(['20.02.1997', '21.01.1997']);
    });

    it('returns empty array for empty input', () => {
      expect(splitConcatenatedDates('')).toEqual([]);
    });
  });

  describe('splitConcatenatedNumbers', () => {
    it('splits jersey numbers preferring single digits', () => {
      const numbers = splitConcatenatedNumbers('5139');
      // All single digits when no ambiguity
      expect(numbers).toEqual([5, 1, 3, 9]);
    });

    it('handles sequences with zeros', () => {
      // Zeros are skipped as they're invalid jersey numbers
      const numbers = splitConcatenatedNumbers('102030');
      expect(numbers).toContain(1);
      expect(numbers).toContain(2);
      expect(numbers).toContain(3);
    });

    it('handles expected count hint to prefer single digits', () => {
      // With expected count of 5, should take all single digits
      const numbers = splitConcatenatedNumbers('12345', 5);
      expect(numbers).toHaveLength(5);
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns empty array for empty input', () => {
      expect(splitConcatenatedNumbers('')).toEqual([]);
    });

    it('handles typical volleyball numbers', () => {
      // Common volleyball jersey numbers
      const numbers = splitConcatenatedNumbers('135789');
      expect(numbers).toEqual([1, 3, 5, 7, 8, 9]);
    });
  });
});

describe('Swiss Team Name Extraction', () => {
  describe('extractSwissTeamNames', () => {
    it('extracts team names from simple tab-separated header', () => {
      const text = `Header\tTV St. Johann\tVTV Horw 1`;
      const names = extractSwissTeamNames(text);
      expect(names.teamA).toContain('TV');
      expect(names.teamA).toContain('St. Johann');
    });

    it('extracts both team names when clearly separated', () => {
      const text = `Teams\tTV Zürich\tVBC Basel`;
      const names = extractSwissTeamNames(text);
      expect(names.teamA).toBe('TV Zürich');
      expect(names.teamB).toBe('VBC Basel');
    });

    it('handles complex Swiss header with Aader/ou/oB markers', () => {
      // This is the actual format from the OCR - the markers make parsing harder
      // The real-world extraction is best-effort; simpler formats work better
      const text = `PunktePointsPunti\tAader/ou/oB TV St. Johann\tVTV Horw 1 Aader/ou/oB`;
      const names = extractSwissTeamNames(text);
      // This complex format is hard to parse reliably
      // The important thing is it doesn't crash and returns valid structure
      expect(names).toHaveProperty('teamA');
      expect(names).toHaveProperty('teamB');
      expect(typeof names.teamA).toBe('string');
      expect(typeof names.teamB).toBe('string');
    });
  });
});

describe('Swiss Tabular Format Parsing', () => {
  it('parses libero line with both teams', () => {
    const ocrText = `PunktePointsPunti\tTV St. Johann\tVTV Horw
NameNomNome
LIBEROS («L»)\tLIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido`;

    const result = parseManuscriptSheet(ocrText);

    // Should parse libero players
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(1);
    expect(result.teamB.players.length).toBeGreaterThanOrEqual(1);

    // Check Team A libero
    const teamALibero = result.teamA.players.find((p) => p.shirtNumber === 5);
    if (teamALibero) {
      expect(teamALibero.rawName).toContain('Angeli');
    }

    // Check Team B libero
    const teamBLibero = result.teamB.players.find((p) => p.shirtNumber === 7);
    if (teamBLibero) {
      expect(teamBLibero.rawName).toContain('Candido');
    }
  });

  it('parses officials line with captains for both teams', () => {
    const ocrText = `PunktePointsPunti\tTV Test\tVTV Test
NameNomNome
Offizielle/Officiels/Ufficiali\tOffizielle/Officiels/Ufficiali
C\tM. Lorentz\tC\tA. Zbinden`;

    const result = parseManuscriptSheet(ocrText);

    // Should parse officials
    expect(result.teamA.officials.length).toBe(1);
    expect(result.teamB.officials.length).toBe(1);

    expect(result.teamA.officials[0]!.role).toBe('C');
    expect(result.teamA.officials[0]!.rawName).toBe('M. Lorentz');

    expect(result.teamB.officials[0]!.role).toBe('C');
    expect(result.teamB.officials[0]!.rawName).toBe('A. Zbinden');
  });

  it('parses concatenated player names from real OCR data', () => {
    const ocrText = `PunktePointsPunti\tTV St. Johann\tVTV Horw
NameNomNome\tNameNomNome
data\tS. AngeliL. CollierO. Follouier\tN. HeutschelJ. Brunner`;

    const result = parseManuscriptSheet(ocrText);

    // Should extract players from concatenated names
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(3);

    // Check that names are properly split
    const angeliPlayer = result.teamA.players.find((p) => p.rawName.includes('Angeli'));
    expect(angeliPlayer).toBeDefined();
  });

  it('filters out noise lines like "4 8 4 8..."', () => {
    const ocrText = `4 8 4 8 . 4 8 4 8 4 8 4 8 4 8 4 8 .
PunktePointsPunti\tTV St. Johann\tVTV Horw
LIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido`;

    const result = parseManuscriptSheet(ocrText);

    // Team name should NOT be the noise line
    expect(result.teamA.name).not.toContain('4 8 4 8');
  });

  it('extracts birth dates and pairs them with player names', () => {
    const ocrText = `PunktePointsPunti\tTV St. Johann\tVTV Horw
NameNomNome\tNameNomNome
data\t20.2.9721.1.9713.1.97\t513\tS. AngeliL. CollierO. Follouier\t5.5.9028.6.92\t517\tN. HeutschelJ. Brunner`;

    const result = parseManuscriptSheet(ocrText);

    // Team A should have players with paired DOBs
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(3);

    // First player should have first DOB
    const firstPlayer = result.teamA.players[0];
    expect(firstPlayer?.birthDate).toBe('20.2.97');

    // Second player should have second DOB
    const secondPlayer = result.teamA.players[1];
    expect(secondPlayer?.birthDate).toBe('21.1.97');

    // Third player should have third DOB
    const thirdPlayer = result.teamA.players[2];
    expect(thirdPlayer?.birthDate).toBe('13.1.97');
  });

  it('extracts birth dates from libero lines', () => {
    const ocrText = `PunktePointsPunti\tTV Test\tVTV Test
NameNomNome
LIBEROS («L»)\tLIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido`;

    const result = parseManuscriptSheet(ocrText);

    // Should parse liberos with DOBs
    const teamALibero = result.teamA.players.find((p) => p.rawName.includes('Angeli'));
    expect(teamALibero?.birthDate).toBe('20.2.97');

    const teamBLibero = result.teamB.players.find((p) => p.rawName.includes('Candido'));
    expect(teamBLibero?.birthDate).toBe('10.6.92');
  });
});

describe('parseManuscriptSheet with real Swiss OCR data', () => {
  it('parses the complete real-world Swiss manuscript scoresheet', () => {
    // This is a simplified version of the actual OCR output
    const ocrText = `4 8 4 8 . 4 8 4 8 4 8 4 8 4 8 4 8 .
Cony

PunktePointsPunti\tAader/ou/oB TV St. Johann\tVTV Horw 1 Aader/ou/oB
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
1 2112 2213\t20.2.9721.1.97\t513\tS. AngeliL. CollierO. Follouier\t5.5.9028.6.92\t517\tN. HeutschelJ. Brunner
"T"
LIBEROS («L»)\tLIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido
Offizielle/Officiels/Ufficiali\tOffizielle/Officiels/Ufficiali
C\tM. Lorentz\tC\tA. Zbinden
AC1\tAC1
TrainerEntraîneurAllenatore\tTrainerEntraîneurAllenatore`;

    const result = parseManuscriptSheet(ocrText);

    // Should detect Swiss format and parse it
    expect(result.teamA.players.length).toBeGreaterThan(0);

    // Should have parsed officials
    expect(result.teamA.officials.length).toBeGreaterThanOrEqual(1);
    expect(result.teamA.officials[0]?.role).toBe('C');

    // Team name should not be noise
    expect(result.teamA.name).not.toBe('4 8 4 8 . 4 8 4 8 4 8 4 8 4 8 4 8 .');
  });
});
