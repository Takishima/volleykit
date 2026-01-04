import { describe, it, expect } from 'vitest';
import {
  parseICalFeed,
  extractAssignment,
  parseCalendarFeed,
} from './parser';
import type { ICalEvent } from './types';

// Sample iCal content for testing
const SAMPLE_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Volleyball.ch//Volleymanager//EN
BEGIN:VEVENT
UID:referee-convocation-for-game-392936
SUMMARY:ARB 1 | TV St. Johann 1 - VTV Horw 1 (Mobiliar Volley Cup)
DESCRIPTION:Funktion: ARB 1\\nSpiel-Nr: 392936\\nDatum: 15.02.2025\\nZeit: 14:00
DTSTART:20250215T140000
DTEND:20250215T170000
LOCATION:Sporthalle Sternenfeld, Sternenfeldstrasse 50, 4127 Birsfelden
GEO:47.5584;7.6277
END:VEVENT
END:VCALENDAR`;

// Sample with multiple events
const MULTI_EVENT_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:referee-convocation-for-game-100001
SUMMARY:ARB 1 | Team A - Team B (NLA Herren)
DTSTART:20250220T180000
DTEND:20250220T210000
LOCATION:Halle 1, Address 1
GEO:47.1234;8.5678
END:VEVENT
BEGIN:VEVENT
UID:referee-convocation-for-game-100002
SUMMARY:ARB 2 | Team C - Team D (NLA Damen)
DTSTART:20250221T190000
DTEND:20250221T220000
LOCATION:Halle 2, Address 2
END:VEVENT
END:VCALENDAR`;

describe('parseICalFeed', () => {
  describe('basic parsing', () => {
    it('parses a single VEVENT from iCal content', () => {
      const events = parseICalFeed(SAMPLE_ICAL);

      expect(events).toHaveLength(1);
      expect(events[0]!.uid).toBe('referee-convocation-for-game-392936');
      expect(events[0]!.summary).toBe(
        'ARB 1 | TV St. Johann 1 - VTV Horw 1 (Mobiliar Volley Cup)'
      );
    });

    it('parses multiple VEVENTs from iCal content', () => {
      const events = parseICalFeed(MULTI_EVENT_ICAL);

      expect(events).toHaveLength(2);
      expect(events[0]!.uid).toBe('referee-convocation-for-game-100001');
      expect(events[1]!.uid).toBe('referee-convocation-for-game-100002');
    });

    it('parses DTSTART and DTEND to ISO format', () => {
      const events = parseICalFeed(SAMPLE_ICAL);

      expect(events[0]!.dtstart).toBe('2025-02-15T14:00:00');
      expect(events[0]!.dtend).toBe('2025-02-15T17:00:00');
    });

    it('parses LOCATION field', () => {
      const events = parseICalFeed(SAMPLE_ICAL);

      expect(events[0]!.location).toBe(
        'Sporthalle Sternenfeld, Sternenfeldstrasse 50, 4127 Birsfelden'
      );
    });

    it('parses GEO coordinates', () => {
      const events = parseICalFeed(SAMPLE_ICAL);

      expect(events[0]!.geo).toEqual({
        latitude: 47.5584,
        longitude: 7.6277,
      });
    });

    it('handles events without GEO field', () => {
      const events = parseICalFeed(MULTI_EVENT_ICAL);

      expect(events[1]!.geo).toBeNull();
    });
  });

  describe('multi-line field handling (RFC 5545 unfolding)', () => {
    it('unfolds continuation lines starting with space', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:This is a very long summary that continues
 on the next line
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.summary).toBe(
        'This is a very long summary that continueson the next line'
      );
    });

    it('unfolds continuation lines starting with tab', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Summary with tab
\tcontinuation
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.summary).toBe('Summary with tabcontinuation');
    });
  });

  describe('escaped character handling', () => {
    it('unescapes newline characters in DESCRIPTION', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DESCRIPTION:Line 1\\nLine 2\\nLine 3
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.description).toBe('Line 1\nLine 2\nLine 3');
    });

    it('unescapes comma characters', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Team A\\, Division 1 | Match
DESCRIPTION:Test
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.summary).toBe('Team A, Division 1 | Match');
    });

    it('unescapes backslash characters', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test\\\\Path
DESCRIPTION:Test
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.summary).toBe('Test\\Path');
    });

    it('handles escaped backslash followed by n without double-unescaping', () => {
      // \\\\n in the template literal = \\n in the actual string = escaped backslash + n
      // This should become \n (backslash + n), NOT a newline character
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DESCRIPTION:Path\\\\nName
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      // Should be backslash + 'n' + 'N' + 'a' + 'm' + 'e' (6 chars), not newline + 'Name' (5 chars)
      expect(events[0]!.description).toBe('Path\\nName');
      expect(events[0]!.description.length).toBe(10);
    });

    it('unescapes semicolon characters', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DESCRIPTION:Key\\;Value
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.description).toBe('Key;Value');
    });
  });

  describe('date format handling', () => {
    it('handles UTC dates with Z suffix', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000Z
DTEND:20250215T170000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.dtstart).toBe('2025-02-15T14:00:00Z');
      expect(events[0]!.dtend).toBe('2025-02-15T17:00:00Z');
    });

    it('handles date-only format (all-day events)', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:All Day Event
DTSTART:20250215
DTEND:20250216
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.dtstart).toBe('2025-02-15');
      expect(events[0]!.dtend).toBe('2025-02-16');
    });

    it('handles dates with TZID parameter', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART;TZID=Europe/Zurich:20250215T140000
DTEND;TZID=Europe/Zurich:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.dtstart).toBe('2025-02-15T14:00:00');
      expect(events[0]!.dtend).toBe('2025-02-15T17:00:00');
    });

    it('uses DTSTART as DTEND when DTEND is missing', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.dtend).toBe('2025-02-15T14:00:00');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(parseICalFeed('')).toEqual([]);
    });

    it('returns empty array for null/undefined input', () => {
      expect(parseICalFeed(null as unknown as string)).toEqual([]);
      expect(parseICalFeed(undefined as unknown as string)).toEqual([]);
    });

    it('returns empty array for non-string input', () => {
      expect(parseICalFeed(123 as unknown as string)).toEqual([]);
    });

    it('skips events without required UID field', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:No UID
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events).toHaveLength(0);
    });

    it('skips events without required SUMMARY field', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events).toHaveLength(0);
    });

    it('skips events without required DTSTART field', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events).toHaveLength(0);
    });

    it('handles malformed iCal without END:VEVENT', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events).toHaveLength(0);
    });

    it('handles invalid GEO format gracefully', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000
GEO:invalid
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.geo).toBeNull();
    });

    it('handles GEO with non-numeric values', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000
GEO:abc;def
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.geo).toBeNull();
    });

    it('handles events without DESCRIPTION', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.description).toBe('');
    });

    it('handles events without LOCATION', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Test
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events[0]!.location).toBeNull();
    });

    it('handles case-insensitive property names', () => {
      const ical = `BEGIN:VCALENDAR
begin:vevent
uid:test-123
SUMMARY:Test
dtstart:20250215T140000
end:vevent
END:VCALENDAR`;

      const events = parseICalFeed(ical);

      expect(events).toHaveLength(1);
      expect(events[0]!.uid).toBe('test-123');
    });
  });
});

describe('extractAssignment', () => {
  // Helper to create a minimal valid ICalEvent
  function createEvent(overrides: Partial<ICalEvent> = {}): ICalEvent {
    return {
      uid: 'referee-convocation-for-game-392936',
      summary: 'ARB 1 | TV St. Johann 1 - VTV Horw 1 (Mobiliar Volley Cup)',
      description: '',
      dtstart: '2025-02-15T14:00:00',
      dtend: '2025-02-15T17:00:00',
      location: 'Sporthalle Sternenfeld, Sternenfeldstrasse 50, 4127 Birsfelden',
      geo: { latitude: 47.5584, longitude: 7.6277 },
      ...overrides,
    };
  }

  describe('game ID extraction', () => {
    it('extracts game ID from standard UID format', () => {
      const event = createEvent({
        uid: 'referee-convocation-for-game-392936',
      });
      const result = extractAssignment(event);

      expect(result.assignment.gameId).toBe('392936');
      expect(result.parsedFields.gameId).toBe(true);
    });

    it('extracts game ID with many digits', () => {
      const event = createEvent({
        uid: 'referee-convocation-for-game-1234567890',
      });
      const result = extractAssignment(event);

      expect(result.assignment.gameId).toBe('1234567890');
    });

    it('adds warning when game ID cannot be extracted', () => {
      const event = createEvent({
        uid: 'some-other-format-abc',
      });
      const result = extractAssignment(event);

      expect(result.assignment.gameId).toBe('');
      expect(result.parsedFields.gameId).toBe(false);
      expect(result.warnings).toContain('Could not extract game ID from UID');
    });

    it('uses fallback pattern for IDs with hash prefix', () => {
      const event = createEvent({
        uid: 'event-#123456',
      });
      const result = extractAssignment(event);

      expect(result.assignment.gameId).toBe('123456');
      expect(result.parsedFields.gameId).toBe(true);
      expect(result.warnings).toContain(
        'Game ID extracted using fallback pattern'
      );
    });
  });

  describe('role extraction', () => {
    const roleTestCases = [
      { input: 'ARB 1', expected: 'referee1', raw: 'ARB 1' },
      { input: 'ARB 2', expected: 'referee2', raw: 'ARB 2' },
      { input: 'ARB1', expected: 'referee1', raw: 'ARB1' },
      { input: 'ARB2', expected: 'referee2', raw: 'ARB2' },
      { input: 'SR 1', expected: 'referee1', raw: 'SR 1' },
      { input: 'SR 2', expected: 'referee2', raw: 'SR 2' },
      { input: 'JL', expected: 'scorer', raw: 'JL' },
      { input: 'JL 1', expected: 'scorer', raw: 'JL 1' },
      { input: 'JL 2', expected: 'scorer', raw: 'JL 2' },
      { input: 'LR', expected: 'lineReferee', raw: 'LR' },
      { input: 'LR 1', expected: 'lineReferee', raw: 'LR 1' },
      { input: 'LR 2', expected: 'lineReferee', raw: 'LR 2' },
    ];

    roleTestCases.forEach(({ input, expected, raw }) => {
      it(`maps "${input}" to "${expected}"`, () => {
        const event = createEvent({
          summary: `${input} | Team A - Team B (League)`,
        });
        const result = extractAssignment(event);

        expect(result.assignment.role).toBe(expected);
        expect(result.assignment.roleRaw).toBe(raw);
        expect(result.parsedFields.role).toBe(true);
      });
    });

    it('handles case-insensitive role matching', () => {
      const event = createEvent({
        summary: 'arb 1 | Team A - Team B (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.role).toBe('referee1');
    });

    it('handles roles with extra whitespace', () => {
      const event = createEvent({
        summary: '  ARB  1  | Team A - Team B (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.role).toBe('referee1');
    });

    it('returns unknown for unrecognized roles', () => {
      const event = createEvent({
        summary: 'UNKNOWN | Team A - Team B (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.role).toBe('unknown');
      expect(result.assignment.roleRaw).toBe('UNKNOWN');
      expect(result.parsedFields.role).toBe(false);
      expect(result.warnings).toContain('Unknown role format: "UNKNOWN"');
    });
  });

  describe('teams extraction', () => {
    it('extracts home and away teams from standard format', () => {
      const event = createEvent({
        summary: 'ARB 1 | TV St. Johann 1 - VTV Horw 1 (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.homeTeam).toBe('TV St. Johann 1');
      expect(result.assignment.awayTeam).toBe('VTV Horw 1');
      expect(result.parsedFields.teams).toBe(true);
    });

    it('handles teams with special characters', () => {
      const event = createEvent({
        summary: 'ARB 1 | VBC Zürich (W) - BC Bern/Köniz 2 (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.homeTeam).toBe('VBC Zürich (W)');
      expect(result.assignment.awayTeam).toBe('BC Bern/Köniz 2');
    });

    it('handles teams with numbers in names', () => {
      const event = createEvent({
        summary: 'ARB 1 | Team 1 Basel 3 - FC 2000 Luzern 1 (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.homeTeam).toBe('Team 1 Basel 3');
      expect(result.assignment.awayTeam).toBe('FC 2000 Luzern 1');
    });

    it('adds warning when teams cannot be extracted', () => {
      const event = createEvent({
        summary: 'ARB 1 | No separator here (League)',
      });
      const result = extractAssignment(event);

      expect(result.parsedFields.teams).toBe(false);
      expect(result.warnings).toContain('Could not extract teams from summary');
    });

    it('handles summary without pipe separator', () => {
      const event = createEvent({
        summary: 'Some random event title',
      });
      const result = extractAssignment(event);

      expect(result.assignment.homeTeam).toBe('');
      expect(result.assignment.awayTeam).toBe('');
      expect(result.parsedFields.teams).toBe(false);
    });

    it('handles pipe without spaces', () => {
      const event = createEvent({
        summary: 'ARB 1|Team A - Team B (League)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.roleRaw).toBe('ARB 1');
    });
  });

  describe('league extraction', () => {
    it('extracts league from parentheses at end of summary', () => {
      const event = createEvent({
        summary: 'ARB 1 | Team A - Team B (Mobiliar Volley Cup)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.league).toBe('Mobiliar Volley Cup');
      expect(result.parsedFields.league).toBe(true);
    });

    it('handles leagues with special characters', () => {
      const event = createEvent({
        summary: 'ARB 1 | Team A - Team B (NLA Herren 2024/25)',
      });
      const result = extractAssignment(event);

      expect(result.assignment.league).toBe('NLA Herren 2024/25');
    });

    it('adds warning when league cannot be extracted', () => {
      const event = createEvent({
        summary: 'ARB 1 | Team A - Team B',
      });
      const result = extractAssignment(event);

      expect(result.assignment.league).toBe('');
      expect(result.parsedFields.league).toBe(false);
      expect(result.warnings).toContain(
        'Could not extract league from summary'
      );
    });
  });

  describe('location parsing', () => {
    it('extracts hall name and address from location', () => {
      const event = createEvent({
        location: 'Sporthalle Sternenfeld, Sternenfeldstrasse 50, 4127 Birsfelden',
      });
      const result = extractAssignment(event);

      expect(result.assignment.hallName).toBe('Sporthalle Sternenfeld');
      expect(result.assignment.address).toBe(
        'Sternenfeldstrasse 50, 4127 Birsfelden'
      );
      expect(result.parsedFields.venue).toBe(true);
      expect(result.parsedFields.address).toBe(true);
    });

    it('handles location without comma', () => {
      const event = createEvent({
        location: 'Sporthalle Sternenfeld',
      });
      const result = extractAssignment(event);

      expect(result.assignment.hallName).toBe('Sporthalle Sternenfeld');
      expect(result.assignment.address).toBe('Sporthalle Sternenfeld');
    });

    it('handles null location', () => {
      const event = createEvent({
        location: null,
      });
      const result = extractAssignment(event);

      expect(result.assignment.hallName).toBeNull();
      expect(result.assignment.address).toBeNull();
      expect(result.parsedFields.venue).toBe(false);
      expect(result.parsedFields.address).toBe(false);
    });
  });

  describe('coordinates handling', () => {
    it('includes coordinates from event geo field', () => {
      const event = createEvent({
        geo: { latitude: 47.5584, longitude: 7.6277 },
      });
      const result = extractAssignment(event);

      expect(result.assignment.coordinates).toEqual({
        latitude: 47.5584,
        longitude: 7.6277,
      });
      expect(result.parsedFields.coordinates).toBe(true);
    });

    it('handles null coordinates', () => {
      const event = createEvent({
        geo: null,
      });
      const result = extractAssignment(event);

      expect(result.assignment.coordinates).toBeNull();
      expect(result.parsedFields.coordinates).toBe(false);
    });
  });

  describe('gender detection', () => {
    const genderTestCases = [
      // German patterns
      { league: 'NLA Herren', description: '', expected: 'men' },
      { league: 'NLB Damen', description: '', expected: 'women' },
      { league: 'Mixed League', description: '', expected: 'mixed' },
      // French patterns
      { league: 'Ligue Hommes', description: '', expected: 'men' },
      { league: 'Ligue Femmes', description: '', expected: 'women' },
      // Gender symbols in description
      { league: 'Some League', description: 'Match ♂', expected: 'men' },
      { league: 'Some League', description: 'Match ♀', expected: 'women' },
      // Unknown when no pattern matches
      { league: 'Mobiliar Volley Cup', description: '', expected: 'unknown' },
    ];

    genderTestCases.forEach(({ league, description, expected }) => {
      it(`detects "${expected}" from league "${league}" and description "${description}"`, () => {
        const event = createEvent({
          summary: `ARB 1 | Team A - Team B (${league})`,
          description,
        });
        const result = extractAssignment(event);

        expect(result.assignment.gender).toBe(expected);
      });
    });
  });

  describe('maps URL handling', () => {
    it('extracts maps URL from description if present', () => {
      const event = createEvent({
        description:
          'Location: https://maps.google.com/maps?q=47.5,7.6 Details here',
        geo: null,
      });
      const result = extractAssignment(event);

      expect(result.assignment.mapsUrl).toBe(
        'https://maps.google.com/maps?q=47.5,7.6'
      );
    });

    it('extracts google.com/maps URL from description', () => {
      const event = createEvent({
        description:
          'Location: https://www.google.com/maps/place/Test Details',
        geo: null,
      });
      const result = extractAssignment(event);

      expect(result.assignment.mapsUrl).toBe(
        'https://www.google.com/maps/place/Test'
      );
    });

    it('builds maps URL from coordinates when not in description', () => {
      const event = createEvent({
        description: 'No maps link here',
        geo: { latitude: 47.5584, longitude: 7.6277 },
      });
      const result = extractAssignment(event);

      expect(result.assignment.mapsUrl).toBe(
        'https://www.google.com/maps?q=47.5584,7.6277'
      );
    });

    it('builds maps URL from address when no coordinates', () => {
      const event = createEvent({
        description: 'No maps link here',
        geo: null,
        location: 'Hall, Some Address 123',
      });
      const result = extractAssignment(event);

      expect(result.assignment.mapsUrl).toBe(
        'https://www.google.com/maps/search/?api=1&query=Some%20Address%20123'
      );
    });

    it('returns null when no maps info available', () => {
      const event = createEvent({
        description: '',
        geo: null,
        location: null,
      });
      const result = extractAssignment(event);

      expect(result.assignment.mapsUrl).toBeNull();
    });
  });

  describe('confidence calculation', () => {
    it('returns high confidence when all critical and most optional fields are parsed', () => {
      const event = createEvent(); // Default event has all fields
      const result = extractAssignment(event);

      expect(result.confidence).toBe('high');
    });

    it('returns medium confidence when critical fields parsed but some optional missing', () => {
      const event = createEvent({
        geo: null,
        location: null,
      });
      const result = extractAssignment(event);

      expect(result.confidence).toBe('medium');
    });

    it('returns low confidence when critical fields are missing', () => {
      const event = createEvent({
        uid: 'invalid-uid',
        summary: 'Invalid summary format',
      });
      const result = extractAssignment(event);

      expect(result.confidence).toBe('low');
    });

    it('returns low confidence when game ID cannot be extracted', () => {
      const event = createEvent({
        uid: 'no-game-id-here',
      });
      const result = extractAssignment(event);

      expect(result.confidence).toBe('low');
    });

    it('returns low confidence when role is unknown', () => {
      const event = createEvent({
        summary: 'UNKNOWN | Team A - Team B (League)',
      });
      const result = extractAssignment(event);

      expect(result.confidence).toBe('low');
    });

    it('returns low confidence when teams cannot be extracted', () => {
      const event = createEvent({
        summary: 'ARB 1 | No team separator (League)',
      });
      const result = extractAssignment(event);

      expect(result.confidence).toBe('low');
    });
  });

  describe('time handling', () => {
    it('includes start and end times from event', () => {
      const event = createEvent({
        dtstart: '2025-02-15T14:00:00',
        dtend: '2025-02-15T17:00:00',
      });
      const result = extractAssignment(event);

      expect(result.assignment.startTime).toBe('2025-02-15T14:00:00');
      expect(result.assignment.endTime).toBe('2025-02-15T17:00:00');
    });
  });
});

describe('parseCalendarFeed', () => {
  it('parses complete iCal feed and returns assignments', () => {
    const results = parseCalendarFeed(SAMPLE_ICAL);

    expect(results).toHaveLength(1);
    expect(results[0]!.assignment.gameId).toBe('392936');
    expect(results[0]!.assignment.homeTeam).toBe('TV St. Johann 1');
    expect(results[0]!.assignment.awayTeam).toBe('VTV Horw 1');
  });

  it('parses multiple events and returns all assignments', () => {
    const results = parseCalendarFeed(MULTI_EVENT_ICAL);

    expect(results).toHaveLength(2);
    expect(results[0]!.assignment.gameId).toBe('100001');
    expect(results[1]!.assignment.gameId).toBe('100002');
  });

  it('returns empty array for empty input', () => {
    const results = parseCalendarFeed('');

    expect(results).toEqual([]);
  });

  it('handles mixed valid and invalid events', () => {
    const mixedIcal = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100001
SUMMARY:ARB 1 | Team A - Team B (League)
DTSTART:20250215T140000
END:VEVENT
BEGIN:VEVENT
UID:missing-summary
DTSTART:20250215T140000
END:VEVENT
BEGIN:VEVENT
UID:referee-convocation-for-game-100002
SUMMARY:ARB 2 | Team C - Team D (League)
DTSTART:20250215T180000
END:VEVENT
END:VCALENDAR`;

    const results = parseCalendarFeed(mixedIcal);

    expect(results).toHaveLength(2);
    expect(results[0]!.assignment.gameId).toBe('100001');
    expect(results[1]!.assignment.gameId).toBe('100002');
  });

  it('allows filtering by confidence level', () => {
    const mixedIcal = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100001
SUMMARY:ARB 1 | Team A - Team B (League)
DTSTART:20250215T140000
LOCATION:Hall, Address
GEO:47.5;7.6
END:VEVENT
BEGIN:VEVENT
UID:bad-uid-format
SUMMARY:UNKNOWN | Something (League)
DTSTART:20250215T140000
END:VEVENT
END:VCALENDAR`;

    const results = parseCalendarFeed(mixedIcal);
    const highConfidence = results.filter((r) => r.confidence === 'high');
    const lowConfidence = results.filter((r) => r.confidence === 'low');

    expect(highConfidence).toHaveLength(1);
    expect(lowConfidence).toHaveLength(1);
  });
});

describe('integration scenarios', () => {
  it('handles a realistic German iCal feed', () => {
    const germanIcal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Volleyball.ch//Volleymanager//DE
BEGIN:VEVENT
UID:referee-convocation-for-game-456789
SUMMARY:ARB 1 | VBC Zürich - Volley Luzern 1 (NLA Herren)
DESCRIPTION:Funktion: ARB 1\\nSpiel-Nr: 456789\\nDatum: 20.02.2025\\nZeit: 19:30\\nTeams: VBC Zürich vs Volley Luzern 1\\nLiga: NLA Herren\\nHalle: Saalsporthalle\\nAdresse: Sihlhölzlistrasse 5\\, 8045 Zürich\\nKontakt: Max Muster (+41 79 123 45 67)
DTSTART:20250220T193000
DTEND:20250220T220000
LOCATION:Saalsporthalle, Sihlhölzlistrasse 5, 8045 Zürich
GEO:47.3769;8.5417
END:VEVENT
END:VCALENDAR`;

    const results = parseCalendarFeed(germanIcal);

    expect(results).toHaveLength(1);
    const assignment = results[0]!.assignment;

    expect(assignment.gameId).toBe('456789');
    expect(assignment.role).toBe('referee1');
    expect(assignment.roleRaw).toBe('ARB 1');
    expect(assignment.homeTeam).toBe('VBC Zürich');
    expect(assignment.awayTeam).toBe('Volley Luzern 1');
    expect(assignment.league).toBe('NLA Herren');
    expect(assignment.gender).toBe('men');
    expect(assignment.hallName).toBe('Saalsporthalle');
    expect(assignment.startTime).toBe('2025-02-20T19:30:00');
    expect(results[0]!.confidence).toBe('high');
  });

  it('handles a French iCal feed', () => {
    const frenchIcal = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:referee-convocation-for-game-789012
SUMMARY:ARB 2 | Genève Volley - Lausanne UC (Ligue Femmes A)
DESCRIPTION:Fonction: ARB 2\\nMatch: 789012\\nDate: 22.02.2025\\nLigue: Ligue Femmes A
DTSTART:20250222T150000
DTEND:20250222T180000
LOCATION:Centre Sportif du Bois-des-Frères, Route de Valavran 10, 1293 Bellevue
GEO:46.2539;6.1589
END:VEVENT
END:VCALENDAR`;

    const results = parseCalendarFeed(frenchIcal);

    expect(results).toHaveLength(1);
    const assignment = results[0]!.assignment;

    expect(assignment.gameId).toBe('789012');
    expect(assignment.role).toBe('referee2');
    expect(assignment.homeTeam).toBe('Genève Volley');
    expect(assignment.awayTeam).toBe('Lausanne UC');
    expect(assignment.league).toBe('Ligue Femmes A');
    expect(assignment.gender).toBe('women');
  });

  it('handles events with gender symbols', () => {
    const icalWithSymbols = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-111222
SUMMARY:JL 1 | Team Alpha - Team Beta (Cup ♀)
DESCRIPTION:Match für Frauen ♀
DTSTART:20250225T140000
DTEND:20250225T170000
LOCATION:Sportcenter, Main Street 1
END:VEVENT
END:VCALENDAR`;

    const results = parseCalendarFeed(icalWithSymbols);
    const assignment = results[0]!.assignment;

    expect(assignment.role).toBe('scorer');
    expect(assignment.gender).toBe('women');
  });

  it('handles line referee role', () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-333444
SUMMARY:LR 2 | Home Team - Away Team (League)
DTSTART:20250228T160000
DTEND:20250228T190000
END:VEVENT
END:VCALENDAR`;

    const results = parseCalendarFeed(ical);
    const assignment = results[0]!.assignment;

    expect(assignment.role).toBe('lineReferee');
    expect(assignment.roleRaw).toBe('LR 2');
  });
});

describe('extended field parsing', () => {
  describe('parseGameNumber', () => {
    it('extracts game number from Match pattern in description', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-382360
SUMMARY:ARB 1 | Team A - Team B (NLA)
DESCRIPTION:Match: #382360 | 05.02.2026 20:30 | OTA VOLLEY H1 — VBC Rämi H3
DTSTART:20260205T203000
DTEND:20260205T230000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.gameNumber).toBe(382360);
    });

    it('extracts game number from German Spiel pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-123456
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Spiel: #123456 | Details
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.gameNumber).toBe(123456);
    });

    it('extracts game number from French Partie pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-789012
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Partie: #789012
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.gameNumber).toBe(789012);
    });

    it('extracts game number without hash prefix', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-456789
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Match: 456789 | Details
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.gameNumber).toBe(456789);
    });

    it('returns null when no game number found', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100000
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:No game number here
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.gameNumber).toBeNull();
    });
  });

  describe('parseLeagueCategory', () => {
    it('extracts league category from French Ligue pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100001
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Ligue: #6652 | 3L | ♂
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.leagueCategory).toBe('3L');
    });

    it('extracts league category from German Liga pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100002
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Liga: #1234 | NLA | ♂
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.leagueCategory).toBe('NLA');
    });

    it('extracts league category from English League pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100003
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:League: #5678 | NLB | ♀
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.leagueCategory).toBe('NLB');
    });

    it('extracts league category from Italian Lega pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100004
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Lega: #9999 | 2L | ♂
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.leagueCategory).toBe('2L');
    });

    it('returns null when no league category found', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100005
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:No league info here
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.leagueCategory).toBeNull();
    });

    it('handles league line with insufficient parts', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-100006
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Ligue: #1234
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.leagueCategory).toBeNull();
    });
  });

  describe('parseRefereeNames', () => {
    it('extracts referee1 name from ARB 1 pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-200001
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:ARB convoqués:\\nARB 1: Damien Nguyen | ngn.damien@gmail.com | +41786795571
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.referees.referee1).toBe('Damien Nguyen');
    });

    it('extracts referee2 name from ARB 2 pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-200002
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:ARB 2: Peter Müller | peterc.mueller@icloud.com | +41791940964
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.referees.referee2).toBe('Peter Müller');
    });

    it('extracts both referees when present', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-200003
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:ARB 1: Damien Nguyen | email1\\nARB 2: Peter Müller | email2
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.referees.referee1).toBe('Damien Nguyen');
      expect(results[0]!.assignment.referees.referee2).toBe('Peter Müller');
    });

    it('extracts line referees from LR pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-200004
SUMMARY:LR 1 | Team A - Team B (League)
DESCRIPTION:LR 1: Line Ref One | email1\\nLR 2: Line Ref Two | email2
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.referees.lineReferee1).toBe('Line Ref One');
      expect(results[0]!.assignment.referees.lineReferee2).toBe('Line Ref Two');
    });

    it('extracts referees using SR pattern (German)', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-200005
SUMMARY:SR 1 | Team A - Team B (League)
DESCRIPTION:SR 1: Hans Meier | email
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.referees.referee1).toBe('Hans Meier');
    });

    it('returns empty object when no referees found', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-200006
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:No referee info here
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.referees).toEqual({});
    });
  });

  describe('parseHallInfo', () => {
    it('extracts hall ID and name from French Salle pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-300001
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Salle: #3661 | Turnhalle Sekundarschule Feld (H)
DTSTART:20250215T140000
DTEND:20250215T170000
LOCATION:Turnhalle Sekundarschule Feld (H), Bergstrasse 2, 8800 Thalwil
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.hallId).toBe('3661');
      expect(results[0]!.assignment.hallName).toBe('Turnhalle Sekundarschule Feld (H)');
    });

    it('extracts hall ID from German Halle pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-300002
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Halle: #1234 | Sporthalle Zürich
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.hallId).toBe('1234');
    });

    it('extracts hall ID from English Hall pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-300003
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Hall: #5678 | Sports Center
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.hallId).toBe('5678');
    });

    it('extracts hall ID from Italian Sala pattern', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-300004
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Sala: #9999 | Palestra Comunale
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.hallId).toBe('9999');
    });

    it('handles hall info without hash prefix', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-300005
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:Salle: 1234 | Hall Name
DTSTART:20250215T140000
DTEND:20250215T170000
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.hallId).toBe('1234');
    });

    it('returns null for hall ID when no hall info found', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:referee-convocation-for-game-300006
SUMMARY:ARB 1 | Team A - Team B (League)
DESCRIPTION:No hall info here
DTSTART:20250215T140000
DTEND:20250215T170000
LOCATION:Some Location
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results[0]!.assignment.hallId).toBeNull();
    });
  });

  describe('combined realistic scenario', () => {
    it('parses all extended fields from a complete iCal entry', () => {
      const ical = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:referee-convocation-for-game-382360
SUMMARY:ARB 1 | OTA VOLLEY H1 - VBC Rämi H3 (3L Herren)
DESCRIPTION:Engagé en tant que: ARB 1\\nMatch: #382360 | 05.02.2026 20:30 | OTA VOLLEY H1 — VBC Rämi H3\\nLigue: #6652 | 3L | ♂\\nARB convoqués:\\n\\tARB 1: Damien Nguyen | ngn.damien@gmail.com | +41786795571\\n\\tARB 2: Peter Müller | peterc.mueller@icloud.com | +41791940964\\nSalle: #3661 | Turnhalle Sekundarschule Feld (H)\\nAdresse: Bergstrasse 2, 8800 Thalwil\\nhttps://maps.google.com/?q=8FVC7HR7%2BC3&hl=fr
DTSTART:20260205T203000
DTEND:20260205T230000
LOCATION:Turnhalle Sekundarschule Feld (H), Bergstrasse 2, 8800 Thalwil
GEO:47.2900;8.5600
END:VEVENT
END:VCALENDAR`;

      const results = parseCalendarFeed(ical);
      expect(results).toHaveLength(1);

      const assignment = results[0]!.assignment;
      expect(assignment.gameId).toBe('382360');
      expect(assignment.gameNumber).toBe(382360);
      expect(assignment.leagueCategory).toBe('3L');
      expect(assignment.hallId).toBe('3661');
      expect(assignment.hallName).toBe('Turnhalle Sekundarschule Feld (H)');
      expect(assignment.referees.referee1).toBe('Damien Nguyen');
      expect(assignment.referees.referee2).toBe('Peter Müller');
      expect(assignment.gender).toBe('men');
    });
  });
});
