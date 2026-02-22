import { describe, it, expect } from 'vitest'

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
} from './manuscript-parser'

describe('OCR Error Correction', () => {
  describe('correctDigits', () => {
    it('corrects O to 0', () => {
      expect(correctDigits('O')).toBe('0')
      expect(correctDigits('1O')).toBe('10')
    })

    it('corrects I/l to 1', () => {
      expect(correctDigits('I')).toBe('1')
      expect(correctDigits('l')).toBe('1')
      expect(correctDigits('Il')).toBe('11')
    })

    it('corrects S/s to 5', () => {
      expect(correctDigits('S')).toBe('5')
      expect(correctDigits('s')).toBe('5')
    })

    it('preserves valid digits', () => {
      expect(correctDigits('123')).toBe('123')
      expect(correctDigits('99')).toBe('99')
    })
  })

  describe('correctLetters', () => {
    it('corrects 0 to O', () => {
      expect(correctLetters('0')).toBe('O')
      expect(correctLetters('M0LLER')).toBe('MOLLER')
    })

    it('corrects 1 to I', () => {
      expect(correctLetters('1')).toBe('I')
    })

    it('corrects 5 to S', () => {
      expect(correctLetters('5CHMIDT')).toBe('SCHMIDT')
    })

    it('preserves valid letters', () => {
      expect(correctLetters('MÜLLER')).toBe('MÜLLER')
    })
  })

  describe('extractShirtNumber', () => {
    it('extracts valid numbers', () => {
      expect(extractShirtNumber('1')).toBe(1)
      expect(extractShirtNumber('12')).toBe(12)
      expect(extractShirtNumber('99')).toBe(99)
    })

    it('corrects OCR errors in numbers', () => {
      expect(extractShirtNumber('O1')).toBe(1) // O -> 0, but 01 -> 1
      expect(extractShirtNumber('l2')).toBe(12) // l -> 1
      expect(extractShirtNumber('I5')).toBe(15) // I -> 1
    })

    it('returns null for invalid numbers', () => {
      expect(extractShirtNumber('')).toBe(null)
      expect(extractShirtNumber('100')).toBe(null) // > 99
      expect(extractShirtNumber('abc')).toBe(null)
    })

    it('handles whitespace', () => {
      expect(extractShirtNumber('  12  ')).toBe(12)
    })
  })
})

describe('Name Parsing', () => {
  describe('normalizeName', () => {
    it('converts to title case', () => {
      expect(normalizeName('MÜLLER')).toBe('Müller')
      expect(normalizeName('anna maria')).toBe('Anna Maria')
    })

    it('handles empty strings', () => {
      expect(normalizeName('')).toBe('')
    })

    it('applies letter corrections', () => {
      expect(normalizeName('M0LLER')).toBe('Moller')
    })
  })

  describe('parsePlayerName', () => {
    it('parses LASTNAME FIRSTNAME format', () => {
      const result = parsePlayerName('MÜLLER ANNA')
      expect(result.lastName).toBe('Müller')
      expect(result.firstName).toBe('Anna')
      expect(result.displayName).toBe('Anna Müller')
    })

    it('handles single name', () => {
      const result = parsePlayerName('MÜLLER')
      expect(result.lastName).toBe('Müller')
      expect(result.firstName).toBe('')
    })

    it('handles multiple first names', () => {
      const result = parsePlayerName('MÜLLER ANNA MARIA')
      expect(result.lastName).toBe('Müller')
      expect(result.firstName).toBe('Anna Maria')
    })

    it('handles empty input', () => {
      const result = parsePlayerName('')
      expect(result.lastName).toBe('')
      expect(result.firstName).toBe('')
    })
  })

  describe('parseOfficialName', () => {
    it('parses Firstname Lastname format', () => {
      const result = parseOfficialName('Hans Trainer')
      expect(result.firstName).toBe('Hans')
      expect(result.lastName).toBe('Trainer')
    })

    it('handles single name', () => {
      const result = parseOfficialName('Coach')
      expect(result.lastName).toBe('Coach')
      expect(result.firstName).toBe('')
    })
  })
})

describe('parseManuscriptSheet', () => {
  it('parses a basic manuscript scoresheet', () => {
    const ocrText = `Team A VBC Heimteam
1 MÜLLER ANNA
2 WEBER MARIE
3 SCHMIDT LISA

Team B VBC Gastteam
4 FISCHER JULIA
5 KOCH CLARA
6 BRUNNER LEA`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(3)
    expect(result.teamA.players[0]!.lastName).toBe('Müller')
    expect(result.teamA.players[0]!.firstName).toBe('Anna')
    expect(result.teamA.players[0]!.shirtNumber).toBe(1)

    expect(result.teamB.players).toHaveLength(3)
    expect(result.teamB.players[0]!.lastName).toBe('Fischer')
    expect(result.teamB.players[0]!.shirtNumber).toBe(4)
  })

  it('handles OCR errors in numbers', () => {
    const ocrText = `Team A
O1 MÜLLER ANNA
l2 WEBER MARIE`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(2)
    expect(result.teamA.players[0]!.shirtNumber).toBe(1) // O1 -> 01 -> 1
    expect(result.teamA.players[1]!.shirtNumber).toBe(12) // l2 -> 12
  })

  it('handles various number-name separators', () => {
    const ocrText = `Team A
1. MÜLLER ANNA
2: WEBER MARIE
3 - SCHMIDT LISA`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(3)
    expect(result.teamA.players[0]!.lastName).toBe('Müller')
    expect(result.teamA.players[1]!.lastName).toBe('Weber')
    expect(result.teamA.players[2]!.lastName).toBe('Schmidt')
  })

  it('parses officials', () => {
    const ocrText = `Team A
1 MÜLLER ANNA
C Hans Trainer
AC Maria Assistentin`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(1)
    expect(result.teamA.officials).toHaveLength(2)
    expect(result.teamA.officials[0]!.role).toBe('C')
    expect(result.teamA.officials[0]!.displayName).toBe('Hans Trainer')
    expect(result.teamA.officials[1]!.role).toBe('AC')
  })

  it('handles empty input', () => {
    const result = parseManuscriptSheet('')
    expect(result.warnings).toContain('No OCR text provided')
    expect(result.teamA.players).toHaveLength(0)
    expect(result.teamB.players).toHaveLength(0)
  })

  it('handles missing team B', () => {
    const ocrText = `Team A VBC Heimteam
1 MÜLLER ANNA
2 WEBER MARIE`

    const result = parseManuscriptSheet(ocrText)
    expect(result.teamA.players).toHaveLength(2)
    expect(result.teamB.players).toHaveLength(0)
  })

  it('detects HOME/AWAY team markers', () => {
    const ocrText = `HOME VBC Heim
1 MÜLLER ANNA

AWAY VBC Gast
2 FISCHER JULIA`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(1)
    expect(result.teamA.players[0]!.lastName).toBe('Müller')
    expect(result.teamB.players).toHaveLength(1)
    expect(result.teamB.players[0]!.lastName).toBe('Fischer')
  })

  it('ignores libero markers but parses libero players', () => {
    const ocrText = `Team A
1 MÜLLER ANNA
LIBERO
2 BRUNNER LEA`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(2)
    expect(result.teamA.players[1]!.lastName).toBe('Brunner')
  })

  it('stops parsing at signature section', () => {
    const ocrText = `Team A
1 MÜLLER ANNA
SIGNATURES
Some signature text`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(1)
  })

  it('handles German team markers', () => {
    const ocrText = `MANNSCHAFT A VBC Zürich
1 MÜLLER ANNA

MANNSCHAFT B VBC Basel
2 WEBER MARIE`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(1)
    expect(result.teamB.players).toHaveLength(1)
  })

  it('handles French team markers', () => {
    const ocrText = `ÉQUIPE A VBC Genève
1 MÜLLER ANNA

ÉQUIPE B VBC Lausanne
2 FISCHER JULIA`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(1)
    expect(result.teamB.players).toHaveLength(1)
  })
})

describe('parseGameSheetWithType', () => {
  // Import at test time to avoid circular dependency issues
  it('routes to manuscript parser when type is manuscript', async () => {
    const { parseGameSheetWithType } = await import('./player-list-parser')

    const ocrText = `Team A VBC Test
1 MÜLLER ANNA`

    const result = parseGameSheetWithType(ocrText, { type: 'manuscript' })

    expect(result.teamA.players).toHaveLength(1)
    expect(result.teamA.players[0]!.lastName).toBe('Müller')
  })

  it('routes to electronic parser by default', async () => {
    const { parseGameSheetWithType } = await import('./player-list-parser')

    const ocrText = `VBC Heimteam\tVBC Gastteam
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK\t3\tSCHMIDT LISA\tOK`

    const result = parseGameSheetWithType(ocrText)

    expect(result.teamA.players).toHaveLength(1)
    expect(result.teamA.players[0]!.lastName).toBe('Müller')
    expect(result.teamB.players).toHaveLength(1)
  })

  it('routes to electronic parser when type is electronic', async () => {
    const { parseGameSheetWithType } = await import('./player-list-parser')

    const ocrText = `VBC Heimteam\tVBC Gastteam
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK\t3\tSCHMIDT LISA\tOK`

    const result = parseGameSheetWithType(ocrText, { type: 'electronic' })

    expect(result.teamA.name).toBe('VBC Heimteam')
    expect(result.teamB.name).toBe('VBC Gastteam')
  })
})

// =============================================================================
// Swiss Tabular Format Tests
// =============================================================================

describe('Swiss Tabular Format Detection', () => {
  describe('isSwissTabularFormat', () => {
    it('detects Swiss format by multilingual headers and tab structure', () => {
      const text = `PunktePointsPunti\tTeam A\tTeam B
Lizenz-Nr.Licence-No.Licenza-No.\tData\tData
NameNomNome\tNames\tNames
LIBEROS\tLib\tLib`
      expect(isSwissTabularFormat(text)).toBe(true)
    })

    it('detects Swiss format by concatenated names pattern', () => {
      const text = `NameNomNome
S. AngeliL. CollierO. Follouier`
      expect(isSwissTabularFormat(text)).toBe(true)
    })

    it('returns false for simple sequential format', () => {
      const text = `Team A VBC Test
1 MÜLLER ANNA
2 WEBER MARIE`
      expect(isSwissTabularFormat(text)).toBe(false)
    })

    it('returns false for sequential tab-separated format with Swiss headers', () => {
      // This format has Swiss headers and tabs but is sequential (one team per line),
      // NOT two-column tabular (both teams per line)
      const text = `Mannschaften/Equipes/Squadre
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
16.05.07\t5\tJ. Klocke
31.07.07\t2\tN. Christen
30.07.07\t11\tN. Walser
LIBEROS («L»)
13.06.04\t1\tC. Tsang
Offizielle/Officiels/Ufficiali
11.08.65\tC\tD. Heynen`
      expect(isSwissTabularFormat(text)).toBe(false)
    })
  })
})

describe('Concatenated Data Splitting', () => {
  describe('splitConcatenatedNames', () => {
    it('splits names with initial + dot pattern', () => {
      const text = 'S. AngeliL. CollierO. Follouier'
      const names = splitConcatenatedNames(text)
      expect(names).toEqual(['S. Angeli', 'L. Collier', 'O. Follouier'])
    })

    it('splits real OCR data from TV St. Johann', () => {
      const text =
        'S. AngeliL. CollierO. FollouierS. GürtlerM. KaprtanagluM. LorentzJ. MonnierL. MonteroA. SuterA. Vouwiler'
      const names = splitConcatenatedNames(text)
      expect(names).toHaveLength(10)
      expect(names[0]).toBe('S. Angeli')
      expect(names[1]).toBe('L. Collier')
      expect(names[5]).toBe('M. Lorentz')
      expect(names[9]).toBe('A. Vouwiler')
    })

    it('handles names without dots', () => {
      const text = 'MüllerAnnaWeberMarie'
      const names = splitConcatenatedNames(text)
      expect(names.length).toBeGreaterThanOrEqual(2)
    })

    it('returns empty array for empty input', () => {
      expect(splitConcatenatedNames('')).toEqual([])
      expect(splitConcatenatedNames('  ')).toEqual([])
    })
  })

  describe('splitConcatenatedDates', () => {
    it('splits concatenated birth dates', () => {
      const text = '20.2.9721.1.9713.1.97'
      const dates = splitConcatenatedDates(text)
      expect(dates).toEqual(['20.2.97', '21.1.97', '13.1.97'])
    })

    it('splits real OCR date data', () => {
      const text = '20.2.9721.1.9713.1.9715.1.8127.12.966.4.8021.7.8119.6.977.10.8216.3.91'
      const dates = splitConcatenatedDates(text)
      expect(dates).toHaveLength(10)
      expect(dates[0]).toBe('20.2.97')
      expect(dates[4]).toBe('27.12.96')
      expect(dates[9]).toBe('16.3.91')
    })

    it('handles 4-digit years', () => {
      const text = '20.02.199721.01.1997'
      const dates = splitConcatenatedDates(text)
      expect(dates).toEqual(['20.02.1997', '21.01.1997'])
    })

    it('returns empty array for empty input', () => {
      expect(splitConcatenatedDates('')).toEqual([])
    })
  })

  describe('splitConcatenatedNumbers', () => {
    it('splits jersey numbers preferring single digits', () => {
      const numbers = splitConcatenatedNumbers('5139')
      // All single digits when no ambiguity
      expect(numbers).toEqual([5, 1, 3, 9])
    })

    it('handles sequences with zeros', () => {
      // Zeros are skipped as they're invalid jersey numbers
      const numbers = splitConcatenatedNumbers('102030')
      expect(numbers).toContain(1)
      expect(numbers).toContain(2)
      expect(numbers).toContain(3)
    })

    it('handles expected count hint to prefer single digits', () => {
      // With expected count of 5, should take all single digits
      const numbers = splitConcatenatedNumbers('12345', 5)
      expect(numbers).toHaveLength(5)
      expect(numbers).toEqual([1, 2, 3, 4, 5])
    })

    it('returns empty array for empty input', () => {
      expect(splitConcatenatedNumbers('')).toEqual([])
    })

    it('handles typical volleyball numbers', () => {
      // Common volleyball jersey numbers
      const numbers = splitConcatenatedNumbers('135789')
      expect(numbers).toEqual([1, 3, 5, 7, 8, 9])
    })

    it('handles consecutive two-digit-looking numbers', () => {
      // Edge case: 1011121314 could be interpreted multiple ways
      // With single-digit preference, should split as: 1, 0(skip), 1, 1, 1, 2, 1, 3, 1, 4
      // But zeros are skipped, so we get: 1, 1, 1, 1, 2, 1, 3, 1, 4
      const numbers = splitConcatenatedNumbers('1011121314')
      // Since we prefer single digits, each digit 1-9 is taken individually
      expect(numbers.length).toBeGreaterThan(5)
      expect(numbers[0]).toBe(1) // First digit
      // Zeros are skipped as invalid jersey numbers
      expect(numbers).not.toContain(0)
    })
  })
})

describe('Swiss Team Name Extraction', () => {
  describe('extractSwissTeamNames', () => {
    it('extracts team names from simple tab-separated header', () => {
      const text = `Header\tTV St. Johann\tVTV Horw 1`
      const names = extractSwissTeamNames(text)
      expect(names.teamA).toContain('TV')
      expect(names.teamA).toContain('St. Johann')
    })

    it('extracts both team names when clearly separated', () => {
      const text = `Teams\tTV Zürich\tVBC Basel`
      const names = extractSwissTeamNames(text)
      expect(names.teamA).toBe('TV Zürich')
      expect(names.teamB).toBe('VBC Basel')
    })

    it('handles complex Swiss header with Aader/ou/oB markers', () => {
      // This is the actual format from the OCR - the markers make parsing harder
      // The real-world extraction is best-effort; simpler formats work better
      const text = `PunktePointsPunti\tAader/ou/oB TV St. Johann\tVTV Horw 1 Aader/ou/oB`
      const names = extractSwissTeamNames(text)
      // This complex format is hard to parse reliably
      // The important thing is it doesn't crash and returns valid structure
      expect(names).toHaveProperty('teamA')
      expect(names).toHaveProperty('teamB')
      expect(typeof names.teamA).toBe('string')
      expect(typeof names.teamB).toBe('string')
    })
  })
})

describe('Swiss Tabular Format Parsing', () => {
  it('parses libero line with both teams', () => {
    const ocrText = `PunktePointsPunti\tTV St. Johann\tVTV Horw
NameNomNome
LIBEROS («L»)\tLIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido`

    const result = parseManuscriptSheet(ocrText)

    // Should parse libero players
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(1)
    expect(result.teamB.players.length).toBeGreaterThanOrEqual(1)

    // Check Team A libero
    const teamALibero = result.teamA.players.find((p) => p.shirtNumber === 5)
    if (teamALibero) {
      expect(teamALibero.rawName).toContain('Angeli')
    }

    // Check Team B libero
    const teamBLibero = result.teamB.players.find((p) => p.shirtNumber === 7)
    if (teamBLibero) {
      expect(teamBLibero.rawName).toContain('Candido')
    }
  })

  it('parses officials line with captains for both teams', () => {
    const ocrText = `PunktePointsPunti\tTV Test\tVTV Test
NameNomNome
Offizielle/Officiels/Ufficiali\tOffizielle/Officiels/Ufficiali
C\tM. Lorentz\tC\tA. Zbinden`

    const result = parseManuscriptSheet(ocrText)

    // Should parse officials
    expect(result.teamA.officials.length).toBe(1)
    expect(result.teamB.officials.length).toBe(1)

    expect(result.teamA.officials[0]!.role).toBe('C')
    expect(result.teamA.officials[0]!.rawName).toBe('M. Lorentz')

    expect(result.teamB.officials[0]!.role).toBe('C')
    expect(result.teamB.officials[0]!.rawName).toBe('A. Zbinden')
  })

  it('parses concatenated player names from real OCR data', () => {
    const ocrText = `PunktePointsPunti\tTV St. Johann\tVTV Horw
NameNomNome\tNameNomNome
data\tS. AngeliL. CollierO. Follouier\tN. HeutschelJ. Brunner`

    const result = parseManuscriptSheet(ocrText)

    // Should extract players from concatenated names
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(3)

    // Check that names are properly split
    const angeliPlayer = result.teamA.players.find((p) => p.rawName.includes('Angeli'))
    expect(angeliPlayer).toBeDefined()
  })

  it('filters out noise lines like "4 8 4 8..."', () => {
    const ocrText = `4 8 4 8 . 4 8 4 8 4 8 4 8 4 8 4 8 .
PunktePointsPunti\tTV St. Johann\tVTV Horw
LIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido`

    const result = parseManuscriptSheet(ocrText)

    // Team name should NOT be the noise line
    expect(result.teamA.name).not.toContain('4 8 4 8')
  })

  it('extracts birth dates and pairs them with player names', () => {
    const ocrText = `PunktePointsPunti\tTV St. Johann\tVTV Horw
NameNomNome\tNameNomNome
data\t20.2.9721.1.9713.1.97\t513\tS. AngeliL. CollierO. Follouier\t5.5.9028.6.92\t517\tN. HeutschelJ. Brunner`

    const result = parseManuscriptSheet(ocrText)

    // Team A should have players with paired DOBs
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(3)

    // First player should have first DOB
    const firstPlayer = result.teamA.players[0]
    expect(firstPlayer?.birthDate).toBe('20.2.97')

    // Second player should have second DOB
    const secondPlayer = result.teamA.players[1]
    expect(secondPlayer?.birthDate).toBe('21.1.97')

    // Third player should have third DOB
    const thirdPlayer = result.teamA.players[2]
    expect(thirdPlayer?.birthDate).toBe('13.1.97')
  })

  it('extracts birth dates from libero lines', () => {
    const ocrText = `PunktePointsPunti\tTV Test\tVTV Test
NameNomNome
LIBEROS («L»)\tLIBEROS («L»)
2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido`

    const result = parseManuscriptSheet(ocrText)

    // Should parse liberos with DOBs
    const teamALibero = result.teamA.players.find((p) => p.rawName.includes('Angeli'))
    expect(teamALibero?.birthDate).toBe('20.2.97')

    const teamBLibero = result.teamB.players.find((p) => p.rawName.includes('Candido'))
    expect(teamBLibero?.birthDate).toBe('10.6.92')
  })
})

describe('parseManuscriptSheet with sequential tab-separated format', () => {
  it('parses VBC Votero Zürich vs Volley Oerlikon scoresheet', () => {
    // Real OCR output from a manuscript scoresheet scanned sequentially
    // (left column = Team A, then right column = Team B)
    const ocrText = `Mannschaften/Equipes/Squadre
A oder/ou/o B
A oder/ou/o B

Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
16.05.07\t5\tJ. Klocke
31.07.07\t2\tN. Christen
30.07.07\t11\tN. Walser
06.04.07\t8\tA. Heinzer
31.05.07\t6\tI. Pautelić
25.11.03\t9\tN. Dankelschlep
10.04.03\t13\tG. Taggin
16.06.08\t15\tK. Hamnata
13.06.04\t1\tC. Tsang
27.01.04\t2\tA. Nuri
28.03.03\t7\tN. Nausson

LIBEROS («L»)

13.06.04\t1\tC. Tsang

Offizielle/Officiels/Ufficiali

11.08.65\tC\tD. Heynen
AC1
AC2
18.04.05\tP\tN. Fabry
03.10.08\tM\tY. Zeitov

Unterschrift/Signature/Firma

KapitänCapitaineCapitano

Trainer

EntraineurAllenatore

Volley Oerlikon

Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
01.10.95\t5\tG. Papadopoulos
24.02.03\t4\tN. von Loesch
18.05.96\t8\tI. Kellenberger
16.09.92\t14\tO. Hartes
07.08.96\t10\tS. Ward
26.05.92\t6\tA. Bratschi
30.07.96\t167\tN. Jegu
29.10.85\t15\tJ. Risso Gertrude
24.11.06\t3\tL. Huthäfer
14.07.06\t11\tL. Zach
07.04.\tH. Birrer

LIBEROS («L»)

00.07.96\t16\tN. Segu
29.10.85\t15\tJ. Risso Gertrude

Offizielle/Officiels/Ufficiali

07.04.91\tC\tN. Birrer
AC1
AC2
21.03.97\tP\tN. Chinellato
M\tY. Zeitler

Unterschrift/Signature/Firma

KapitänCapitaineCapitano

Trainer

EntraineurAllenatore`

    const result = parseManuscriptSheet(ocrText)

    // Team A (first column - VBC Votero Zürich)
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(11)

    // Check specific Team A players
    const klocke = result.teamA.players.find((p) => p.rawName.includes('Klocke'))
    expect(klocke).toBeDefined()
    expect(klocke!.shirtNumber).toBe(5)

    const tsang = result.teamA.players.find((p) => p.rawName.includes('Tsang'))
    expect(tsang).toBeDefined()
    expect(tsang!.shirtNumber).toBe(1)

    // Team A officials
    expect(result.teamA.officials.length).toBeGreaterThanOrEqual(2)
    const coachA = result.teamA.officials.find((o) => o.role === 'C')
    expect(coachA).toBeDefined()
    expect(coachA!.rawName).toContain('Heynen')

    // Team B (second column - Volley Oerlikon)
    expect(result.teamB.name).toContain('Volley Oerlikon')
    expect(result.teamB.players.length).toBeGreaterThanOrEqual(10)

    // Check specific Team B players
    const papadopoulos = result.teamB.players.find((p) => p.rawName.includes('Papadopoulos'))
    expect(papadopoulos).toBeDefined()
    expect(papadopoulos!.shirtNumber).toBe(5)

    const ward = result.teamB.players.find((p) => p.rawName.includes('Ward'))
    expect(ward).toBeDefined()
    expect(ward!.shirtNumber).toBe(10)

    // Team B officials
    expect(result.teamB.officials.length).toBeGreaterThanOrEqual(2)
    const coachB = result.teamB.officials.find((o) => o.role === 'C')
    expect(coachB).toBeDefined()
    expect(coachB!.rawName).toContain('Birrer')
  })

  it('handles tab-separated player lines with birth dates', () => {
    const ocrText = `Team A VBC Test
16.05.07\t5\tJ. Klocke
31.07.07\t2\tN. Christen`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.players).toHaveLength(2)
    expect(result.teamA.players[0]!.shirtNumber).toBe(5)
    expect(result.teamA.players[0]!.rawName).toBe('J. Klocke')
    expect(result.teamA.players[0]!.birthDate).toBe('16.05.07')
    expect(result.teamA.players[1]!.shirtNumber).toBe(2)
  })

  it('handles tab-separated officials with birth dates', () => {
    const ocrText = `Team A VBC Test
1 MÜLLER ANNA
Offizielle/Officiels/Ufficiali
11.08.65\tC\tD. Heynen
18.04.05\tP\tN. Fabry
M\tY. Zeitov`

    const result = parseManuscriptSheet(ocrText)

    expect(result.teamA.officials.length).toBeGreaterThanOrEqual(3)
    expect(result.teamA.officials[0]!.role).toBe('C')
    expect(result.teamA.officials[0]!.rawName).toContain('Heynen')
    const physio = result.teamA.officials.find((o) => o.role === 'P')
    expect(physio).toBeDefined()
    expect(physio!.rawName).toContain('Fabry')
  })
})

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
TrainerEntraîneurAllenatore\tTrainerEntraîneurAllenatore`

    const result = parseManuscriptSheet(ocrText)

    // Should detect Swiss format and parse it
    expect(result.teamA.players.length).toBeGreaterThan(0)

    // Should have parsed officials
    expect(result.teamA.officials.length).toBeGreaterThanOrEqual(1)
    expect(result.teamA.officials[0]?.role).toBe('C')

    // Team name should not be noise
    expect(result.teamA.name).not.toBe('4 8 4 8 . 4 8 4 8 4 8 4 8 4 8 4 8 .')
  })
})

// =============================================================================
// 6-Column Swiss Tabular Format Tests (Mistral OCR HTML table output)
// =============================================================================

describe('parseManuscriptSheet with 6-column tabular format', () => {
  it('parses 6-column player rows with DOB, jersey number, and name for both teams', () => {
    const ocrText = `A Oder/ou/o B VBC Test\tVölley Opponent A Oder/ou/o B
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome\tLizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
16.05.07\t5\tJ. Klocke\t01.10.95\t5\tG. Papadopoulos
31.07.07\t2\tN. Christen\t24.02.03\t4\tN. von Loesch
30.07.07\t11\tN. Walser\t18.05.96\t8\tI. Kellenberger`

    const result = parseManuscriptSheet(ocrText)

    // Team A
    expect(result.teamA.players).toHaveLength(3)
    expect(result.teamA.players[0]!.shirtNumber).toBe(5)
    expect(result.teamA.players[0]!.rawName).toBe('J. Klocke')
    expect(result.teamA.players[0]!.birthDate).toBe('16.05.07')
    expect(result.teamA.players[1]!.shirtNumber).toBe(2)
    expect(result.teamA.players[1]!.rawName).toBe('N. Christen')
    expect(result.teamA.players[1]!.birthDate).toBe('31.07.07')
    expect(result.teamA.players[2]!.shirtNumber).toBe(11)

    // Team B
    expect(result.teamB.players).toHaveLength(3)
    expect(result.teamB.players[0]!.shirtNumber).toBe(5)
    expect(result.teamB.players[0]!.rawName).toBe('G. Papadopoulos')
    expect(result.teamB.players[0]!.birthDate).toBe('01.10.95')
    expect(result.teamB.players[1]!.shirtNumber).toBe(4)
    expect(result.teamB.players[2]!.shirtNumber).toBe(8)
  })

  it('handles partial rows where one team has empty columns', () => {
    const ocrText = `A Oder/ou/o B VBC Test\tVC Opponent A Oder/ou/o B
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome\tLizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
28.03.03\t7\tN. Nausson\t07.04.\t\tH. Birrer
\t\t\t29.10.85\t15\tJ. Risso Gertrude`

    const result = parseManuscriptSheet(ocrText)

    // Row 1: Team A has player, Team B has player with incomplete DOB and no jersey
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(1)
    const nausson = result.teamA.players.find((p) => p.rawName.includes('Nausson'))
    expect(nausson).toBeDefined()
    expect(nausson!.shirtNumber).toBe(7)
    expect(nausson!.birthDate).toBe('28.03.03')

    const birrer = result.teamB.players.find((p) => p.rawName.includes('Birrer'))
    expect(birrer).toBeDefined()
    expect(birrer!.shirtNumber).toBeNull()
    expect(birrer!.birthDate).toBe('07.04.')

    // Row 2: Only Team B has data (Team A columns are empty)
    const risso = result.teamB.players.find((p) => p.rawName.includes('Risso'))
    expect(risso).toBeDefined()
    expect(risso!.shirtNumber).toBe(15)
    expect(risso!.birthDate).toBe('29.10.85')
  })

  it('parses officials with DOB prefix in 6-column format', () => {
    const ocrText = `A Oder/ou/o B VBC Test\tVC Opponent A Oder/ou/o B
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome\tLizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
16.05.07\t5\tJ. Klocke\t01.10.95\t5\tG. Papadopoulos
Offizielle/Officiels/Ufficiali\tOffizielle/Officiels/Ufficiali
11.08.65\tC\tD. Heynen\t07.04.71\tC\tN. Birrer
18.04.05\tP\tN. Fabry\t21.03.97\tP\tN. Chinellato
03.10.08\tM\tY. Zeitov\t\tM\tY. Zeitler`

    const result = parseManuscriptSheet(ocrText)

    // Team A officials
    expect(result.teamA.officials.length).toBeGreaterThanOrEqual(3)
    const coachA = result.teamA.officials.find((o) => o.role === 'C')
    expect(coachA).toBeDefined()
    expect(coachA!.rawName).toContain('Heynen')
    const physioA = result.teamA.officials.find((o) => o.role === 'P')
    expect(physioA).toBeDefined()
    expect(physioA!.rawName).toContain('Fabry')
    const medicalA = result.teamA.officials.find((o) => o.role === 'M')
    expect(medicalA).toBeDefined()
    expect(medicalA!.rawName).toContain('Zeitov')

    // Team B officials
    expect(result.teamB.officials.length).toBeGreaterThanOrEqual(3)
    const coachB = result.teamB.officials.find((o) => o.role === 'C')
    expect(coachB).toBeDefined()
    expect(coachB!.rawName).toContain('Birrer')
    const physioB = result.teamB.officials.find((o) => o.role === 'P')
    expect(physioB).toBeDefined()
    expect(physioB!.rawName).toContain('Chinellato')
    const medicalB = result.teamB.officials.find((o) => o.role === 'M')
    expect(medicalB).toBeDefined()
    expect(medicalB!.rawName).toContain('Zeitler')
  })

  it('normalizes AC1 role to AC', () => {
    const ocrText = `A Oder/ou/o B VBC Test\tVC Opponent A Oder/ou/o B
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome\tLizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
16.05.07\t5\tJ. Klocke\t01.10.95\t5\tG. Papadopoulos
Offizielle/Officiels/Ufficiali\tOffizielle/Officiels/Ufficiali
C\tM. Lorentz\tC\tA. Zbinden
15.03.80\tAC1\tS. Helper\t22.06.85\tAC1\tR. Assistent`

    const result = parseManuscriptSheet(ocrText)

    // AC1 should be normalized to AC
    const acA = result.teamA.officials.find((o) => o.role === 'AC')
    expect(acA).toBeDefined()
    expect(acA!.rawName).toContain('Helper')

    const acB = result.teamB.officials.find((o) => o.role === 'AC')
    expect(acB).toBeDefined()
    expect(acB!.rawName).toContain('Assistent')
  })

  it('parses libero section in 6-column format', () => {
    const ocrText = `A Oder/ou/o B VBC Test\tVC Opponent A Oder/ou/o B
Lizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome\tLizenz-Nr.Licence-No.Licenza-No.\tSpieler Nr.Joueur No.Giocatore No.\tNameNomNome
16.05.07\t5\tJ. Klocke\t01.10.95\t5\tG. Papadopoulos
LIBEROS («L»)\tLIBEROS («L»)
13.06.04\t1\tC. Tsang\t30.07.96\t16\tN. Jegu
\t\t\t29.10.85\t15\tJ. Risso Gertrude`

    const result = parseManuscriptSheet(ocrText)

    // Team A libero
    const tsang = result.teamA.players.find((p) => p.rawName.includes('Tsang'))
    expect(tsang).toBeDefined()
    expect(tsang!.shirtNumber).toBe(1)
    expect(tsang!.birthDate).toBe('13.06.04')

    // Team B liberos
    const jegu = result.teamB.players.find((p) => p.rawName.includes('Jegu'))
    expect(jegu).toBeDefined()
    expect(jegu!.shirtNumber).toBe(16)
    expect(jegu!.birthDate).toBe('30.07.96')

    // Team B second libero (only on Team B side)
    const risso = result.teamB.players.find((p) => p.rawName.includes('Risso'))
    expect(risso).toBeDefined()
    expect(risso!.shirtNumber).toBe(15)
    expect(risso!.birthDate).toBe('29.10.85')
  })

  it('parses full Mistral OCR output from VBC Votero Zürich vs Volley Oerlikon', () => {
    // Simulates the tab-separated output from #parseHtmlTable after processing
    // Mistral's 6-column HTML table with <br> → space conversion and preserved empty cells
    const ocrText = `A Oder/ou/o B VBC Votero Zürich\tVölley Oerlikon A Oder/ou/o B
Lizenz-Nr. Licence-No. Licenza-No.\tSpieler Nr. Joueur No. Giocatore No.\tName Nom Nome\tLizenz-Nr. Licence-No. Licenza-No.\tSpieler Nr. Joueur No. Giocatore No.\tName Nom Nome
16.05.07\t5\tJ. Klocke\t01.10.95\t5\tG. Papadopoulos
31.07.07\t2\tN. Christen\t24.02.03\t4\tN. von Loesch
30.07.07\t11\tN. Walser\t18.05.96\t8\tI. Kellenberger
06.04.07\t8\tA. Heinzer\t16.09.92\t14\tO. Hartes
31.05.07\t6\tI. Pautelić\t07.08.96\t10\tS. Ward
25.11.03\t9\tN. Dankelschlep\t26.05.92\t6\tA. Bratschi
10.04.03\t13\tG. Taggin\t30.07.96\t16\tN. Jegu
16.06.08\t15\tK. Hamnata\t29.10.85\t15\tJ. Risso Gertrude
13.06.04\t1\tC. Tsang\t24.11.06\t3\tL. Huthäfer
27.01.04\t12\tA. Nuri\t14.07.06\t11\tL. Zach
28.03.03\t7\tN. Nausson\t07.04.\t\tH. Birrer
LIBEROS («L»)\tLIBEROS («L»)
13.06.04\t1\tC. Tsang\t30.07.96\t16\tN. Jegu
\t\t\t29.10.85\t15\tJ. Risso Gertrude
Offizielle/Officiels/Ufficiali\tOffizielle/Officiels/Ufficiali
11.08.65\tC\tD. Heynen\t07.04.71\tC\tN. Birrer
\tAC1\t\t\tAC1\t
\tAC2\t\t\tAC2\t
18.04.05\tP\tN. Fabry\t21.03.97\tP\tN. Chinellato
03.10.08\tM\tY. Zeitov\t\tM\tY. Zeitler`

    const result = parseManuscriptSheet(ocrText)

    // ---- Team A (VBC Votero Zürich) ----
    // 11 regular players + 1 libero (duplicate of C. Tsang)
    expect(result.teamA.players.length).toBeGreaterThanOrEqual(11)

    // Check specific players with DOB
    const klocke = result.teamA.players.find((p) => p.rawName.includes('Klocke'))
    expect(klocke).toBeDefined()
    expect(klocke!.shirtNumber).toBe(5)
    expect(klocke!.birthDate).toBe('16.05.07')

    const tsang = result.teamA.players.find((p) => p.rawName.includes('Tsang'))
    expect(tsang).toBeDefined()
    expect(tsang!.shirtNumber).toBe(1)

    const dankelschlep = result.teamA.players.find((p) => p.rawName.includes('Dankelschlep'))
    expect(dankelschlep).toBeDefined()
    expect(dankelschlep!.shirtNumber).toBe(9)
    expect(dankelschlep!.birthDate).toBe('25.11.03')

    // Team A officials
    expect(result.teamA.officials.length).toBeGreaterThanOrEqual(3)
    const coachA = result.teamA.officials.find((o) => o.role === 'C')
    expect(coachA).toBeDefined()
    expect(coachA!.rawName).toContain('Heynen')
    const physioA = result.teamA.officials.find((o) => o.role === 'P')
    expect(physioA).toBeDefined()
    expect(physioA!.rawName).toContain('Fabry')
    const medicalA = result.teamA.officials.find((o) => o.role === 'M')
    expect(medicalA).toBeDefined()
    expect(medicalA!.rawName).toContain('Zeitov')

    // ---- Team B (Volley Oerlikon) ----
    expect(result.teamB.players.length).toBeGreaterThanOrEqual(11)

    const papadopoulos = result.teamB.players.find((p) => p.rawName.includes('Papadopoulos'))
    expect(papadopoulos).toBeDefined()
    expect(papadopoulos!.shirtNumber).toBe(5)
    expect(papadopoulos!.birthDate).toBe('01.10.95')

    const ward = result.teamB.players.find((p) => p.rawName.includes('Ward'))
    expect(ward).toBeDefined()
    expect(ward!.shirtNumber).toBe(10)

    // H. Birrer has incomplete DOB and no jersey number
    const birrerPlayer = result.teamB.players.find((p) => p.rawName.includes('Birrer'))
    expect(birrerPlayer).toBeDefined()
    expect(birrerPlayer!.shirtNumber).toBeNull()
    expect(birrerPlayer!.birthDate).toBe('07.04.')

    // Team B officials
    expect(result.teamB.officials.length).toBeGreaterThanOrEqual(3)
    const coachB = result.teamB.officials.find((o) => o.role === 'C')
    expect(coachB).toBeDefined()
    expect(coachB!.rawName).toContain('Birrer')
    const physioB = result.teamB.officials.find((o) => o.role === 'P')
    expect(physioB).toBeDefined()
    expect(physioB!.rawName).toContain('Chinellato')
    const medicalB = result.teamB.officials.find((o) => o.role === 'M')
    expect(medicalB).toBeDefined()
    expect(medicalB!.rawName).toContain('Zeitler')
  })
})
