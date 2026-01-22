/**
 * Tests for calendar utilities.
 *
 * These tests cover the pure functions that don't require React Native.
 */

// Mock react-native
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

import {
  generateICalUrl,
  formatCalendarNotes,
  calculateMatchEndTime,
  getDefaultReminders,
  generateAssignmentDeepLink,
} from './calendar';

describe('generateICalUrl', () => {
  it('generates correct webcal URL with all parameters', () => {
    const url = generateICalUrl({
      baseUrl: 'https://api.example.com',
      associationCode: 'SVRBA',
      refereeId: '12345',
      calendarToken: 'secret-token',
    });

    expect(url).toContain('webcal://');
    expect(url).toContain('api.example.com');
    expect(url).toContain('association=SVRBA');
    expect(url).toContain('referee=12345');
    expect(url).toContain('token=secret-token');
    expect(url).toContain('/api/calendar/assignments.ics');
  });

  it('generates URL without token when not provided', () => {
    const url = generateICalUrl({
      baseUrl: 'https://api.example.com',
      associationCode: 'SVRBA',
      refereeId: '12345',
    });

    expect(url).toContain('association=SVRBA');
    expect(url).toContain('referee=12345');
    expect(url).not.toContain('token=');
  });

  it('converts https to webcal protocol', () => {
    const url = generateICalUrl({
      baseUrl: 'https://api.example.com',
      associationCode: 'TEST',
      refereeId: '1',
    });

    expect(url.startsWith('webcal://')).toBe(true);
    expect(url).not.toContain('https://');
  });

  it('handles special characters in association code', () => {
    const url = generateICalUrl({
      baseUrl: 'https://api.example.com',
      associationCode: 'SVR&BA',
      refereeId: '12345',
    });

    // URLSearchParams encodes special characters
    expect(url).toContain('association=SVR%26BA');
  });
});

describe('generateAssignmentDeepLink', () => {
  it('generates correct deep link URL', () => {
    const url = generateAssignmentDeepLink('abc-123');
    expect(url).toBe('volleykit://assignment/abc-123');
  });

  it('handles UUIDs', () => {
    const url = generateAssignmentDeepLink('550e8400-e29b-41d4-a716-446655440000');
    expect(url).toBe('volleykit://assignment/550e8400-e29b-41d4-a716-446655440000');
  });

  it('handles empty string', () => {
    const url = generateAssignmentDeepLink('');
    expect(url).toBe('volleykit://assignment/');
  });
});

describe('formatCalendarNotes', () => {
  it('formats notes with all fields', () => {
    const notes = formatCalendarNotes({
      id: 'abc-123',
      league: 'NLA Men',
      role: 'First Referee',
      teamHome: 'Team A',
      teamAway: 'Team B',
    });

    expect(notes).toContain('League: NLA Men');
    expect(notes).toContain('Role: First Referee');
    expect(notes).toContain('Match: Team A vs Team B');
    expect(notes).toContain('volleykit://assignment/abc-123');
  });

  it('formats notes with only required fields', () => {
    const notes = formatCalendarNotes({
      id: 'abc-123',
    });

    expect(notes).toContain('Open in VolleyKit:');
    expect(notes).toContain('volleykit://assignment/abc-123');
    expect(notes).not.toContain('League:');
    expect(notes).not.toContain('Role:');
    expect(notes).not.toContain('Match:');
  });

  it('omits match line if only one team is provided', () => {
    const notes = formatCalendarNotes({
      id: 'abc-123',
      teamHome: 'Team A',
    });

    expect(notes).not.toContain('Match:');
  });

  it('includes league without role', () => {
    const notes = formatCalendarNotes({
      id: 'abc-123',
      league: 'NLA Men',
    });

    expect(notes).toContain('League: NLA Men');
    expect(notes).not.toContain('Role:');
  });
});

describe('calculateMatchEndTime', () => {
  it('adds 2 hours to start time', () => {
    const startDate = new Date('2026-01-20T14:00:00.000Z');
    const endDate = calculateMatchEndTime(startDate);

    expect(endDate.getTime() - startDate.getTime()).toBe(2 * 60 * 60 * 1000);
    expect(endDate.getUTCHours()).toBe(16);
  });

  it('handles midnight crossing', () => {
    const startDate = new Date('2026-01-20T23:00:00.000Z');
    const endDate = calculateMatchEndTime(startDate);

    expect(endDate.getUTCHours()).toBe(1);
    expect(endDate.getUTCDate()).toBe(21);
  });

  it('does not modify original date', () => {
    const startDate = new Date('2026-01-20T14:00:00.000Z');
    const originalTime = startDate.getTime();

    calculateMatchEndTime(startDate);

    expect(startDate.getTime()).toBe(originalTime);
  });
});

describe('getDefaultReminders', () => {
  it('returns two reminder times', () => {
    const reminders = getDefaultReminders();
    expect(reminders).toHaveLength(2);
  });

  it('includes 1 day reminder (1440 minutes)', () => {
    const reminders = getDefaultReminders();
    expect(reminders).toContain(60 * 24); // 1440 minutes = 1 day
  });

  it('includes 2 hour reminder (120 minutes)', () => {
    const reminders = getDefaultReminders();
    expect(reminders).toContain(120);
  });

  it('returns reminders in descending order', () => {
    const reminders = getDefaultReminders();
    expect(reminders[0]).toBeGreaterThan(reminders[1]);
  });
});
