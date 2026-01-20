/**
 * Tests for assignment helper utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MODAL_CLEANUP_DELAY,
  DEFAULT_VALIDATION_DEADLINE_HOURS,
  isFromCalendarMode,
  extractTeamNames,
  getTeamNames,
  getTeamNamesFromCompensation,
  isGameReportEligible,
  isValidationEligible,
  isValidationClosed,
  isGamePast,
  isGameAlreadyValidated,
  isActionAvailable,
  formatTeamMatchup,
} from './assignment-helpers';
import type { components } from '../api/schema';

type Assignment = components['schemas']['Assignment'];
type CompensationRecord = components['schemas']['CompensationRecord'];

// Helper to create a minimal assignment for testing
function createAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    __identity: 'test-assignment-id',
    refereeConvocationStatus: 'active',
    refereePosition: 'head-one',
    refereeGame: {
      game: {
        startingDateTime: '2025-06-15T14:00:00Z',
        encounter: {
          teamHome: { name: 'Team A' },
          teamAway: { name: 'Team B' },
        },
        group: {
          phase: {
            league: {
              leagueCategory: {
                name: 'NLA',
              },
            },
          },
        },
        scoresheet: {
          closedAt: null,
        },
      },
    },
    ...overrides,
  } as Assignment;
}

// Helper to create a minimal compensation record for testing
function createCompensation(): CompensationRecord {
  return {
    __identity: 'test-compensation-id',
    refereeConvocationStatus: 'active',
    refereePosition: 'head-one',
    refereeGame: {
      game: {
        startingDateTime: '2025-06-15T14:00:00Z',
        encounter: {
          teamHome: { name: 'Team Home' },
          teamAway: { name: 'Team Away' },
        },
      },
    },
    convocationCompensation: {},
  } as CompensationRecord;
}

describe('Constants', () => {
  it('should have correct MODAL_CLEANUP_DELAY', () => {
    expect(MODAL_CLEANUP_DELAY).toBe(300);
  });

  it('should have correct DEFAULT_VALIDATION_DEADLINE_HOURS', () => {
    expect(DEFAULT_VALIDATION_DEADLINE_HOURS).toBe(6);
  });
});

describe('isFromCalendarMode', () => {
  it('should return false for API-sourced assignment with full league data', () => {
    const assignment = createAssignment();
    expect(isFromCalendarMode(assignment)).toBe(false);
  });

  it('should return true when league is undefined', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: {
          group: {
            phase: {
              league: undefined,
            },
          },
        },
      },
    });
    expect(isFromCalendarMode(assignment)).toBe(true);
  });

  it('should return true when phase is undefined', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: {
          group: {
            phase: undefined,
          },
        },
      },
    });
    expect(isFromCalendarMode(assignment)).toBe(true);
  });

  it('should return true when group is undefined', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: {
          group: undefined,
        },
      },
    });
    expect(isFromCalendarMode(assignment)).toBe(true);
  });

  it('should return true when game is undefined', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: undefined,
      },
    });
    expect(isFromCalendarMode(assignment)).toBe(true);
  });

  it('should return true when refereeGame is undefined', () => {
    const assignment = createAssignment({
      refereeGame: undefined,
    });
    expect(isFromCalendarMode(assignment)).toBe(true);
  });
});

describe('extractTeamNames', () => {
  it('should extract team names from game object', () => {
    const game = {
      encounter: {
        teamHome: { name: 'Home Team' },
        teamAway: { name: 'Away Team' },
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
    });
  });

  it('should return TBD for missing team names', () => {
    const game = {
      encounter: {
        teamHome: {},
        teamAway: {},
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });

  it('should return TBD for undefined encounter', () => {
    const game = {};
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });

  it('should return TBD for undefined game', () => {
    expect(extractTeamNames(undefined)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });

  it('should handle partially missing team data', () => {
    const game = {
      encounter: {
        teamHome: { name: 'Home Only' },
        teamAway: undefined,
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'Home Only',
      awayTeam: 'TBD',
    });
  });
});

describe('getTeamNames', () => {
  it('should extract team names from assignment', () => {
    const assignment = createAssignment();
    expect(getTeamNames(assignment)).toEqual({
      homeTeam: 'Team A',
      awayTeam: 'Team B',
    });
  });

  it('should return TBD for missing refereeGame', () => {
    const assignment = createAssignment({
      refereeGame: undefined,
    });
    expect(getTeamNames(assignment)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });
});

describe('getTeamNamesFromCompensation', () => {
  it('should extract team names from compensation record', () => {
    const compensation = createCompensation();
    expect(getTeamNamesFromCompensation(compensation)).toEqual({
      homeTeam: 'Team Home',
      awayTeam: 'Team Away',
    });
  });

  it('should return TBD for missing refereeGame', () => {
    const compensation = {
      __identity: 'test-compensation-id',
      refereeConvocationStatus: 'active',
      refereePosition: 'head-one',
      refereeGame: undefined,
      convocationCompensation: {},
    } as CompensationRecord;
    expect(getTeamNamesFromCompensation(compensation)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });
});

describe('isGameReportEligible', () => {
  it('should return true for NLA game with head-one position', () => {
    const assignment = createAssignment({
      refereePosition: 'head-one',
      refereeGame: {
        game: {
          group: {
            phase: {
              league: {
                leagueCategory: { name: 'NLA' },
              },
            },
          },
        },
      },
    });
    expect(isGameReportEligible(assignment)).toBe(true);
  });

  it('should return true for NLB game with head-one position', () => {
    const assignment = createAssignment({
      refereePosition: 'head-one',
      refereeGame: {
        game: {
          group: {
            phase: {
              league: {
                leagueCategory: { name: 'NLB' },
              },
            },
          },
        },
      },
    });
    expect(isGameReportEligible(assignment)).toBe(true);
  });

  it('should return false for NLA game with head-two position', () => {
    const assignment = createAssignment({
      refereePosition: 'head-two',
      refereeGame: {
        game: {
          group: {
            phase: {
              league: {
                leagueCategory: { name: 'NLA' },
              },
            },
          },
        },
      },
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false for 1L game even with head-one position', () => {
    const assignment = createAssignment({
      refereePosition: 'head-one',
      refereeGame: {
        game: {
          group: {
            phase: {
              league: {
                leagueCategory: { name: '1L' },
              },
            },
          },
        },
      },
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false for calendar mode assignments', () => {
    const assignment = createAssignment({
      refereePosition: 'head-one',
      refereeGame: {
        game: {
          group: {
            phase: {
              league: undefined,
            },
          },
        },
      },
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false when leagueCategory name is undefined', () => {
    const assignment = createAssignment({
      refereePosition: 'head-one',
      refereeGame: {
        game: {
          group: {
            phase: {
              league: {
                leagueCategory: {},
              },
            },
          },
        },
      },
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });
});

describe('isValidationEligible', () => {
  it('should return true for head-one position', () => {
    const assignment = createAssignment({ refereePosition: 'head-one' });
    expect(isValidationEligible(assignment)).toBe(true);
  });

  it('should return false for head-two position', () => {
    const assignment = createAssignment({ refereePosition: 'head-two' });
    expect(isValidationEligible(assignment)).toBe(false);
  });

  it('should return false for linesman position', () => {
    const assignment = createAssignment({ refereePosition: 'line-one' });
    expect(isValidationEligible(assignment)).toBe(false);
  });
});

describe('isValidationClosed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T20:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false when game has not started', () => {
    // Game is tomorrow
    expect(isValidationClosed('2025-06-16T14:00:00Z')).toBe(false);
  });

  it('should return false when within validation window', () => {
    // Game started 2 hours ago, default deadline is 6 hours
    expect(isValidationClosed('2025-06-15T18:00:00Z')).toBe(false);
  });

  it('should return false at exactly the deadline', () => {
    // Game started exactly 6 hours ago (at 14:00), deadline is 20:00
    expect(isValidationClosed('2025-06-15T14:00:00Z')).toBe(false);
  });

  it('should return true after deadline has passed', () => {
    // Game started 8 hours ago (at 12:00), deadline was 18:00
    expect(isValidationClosed('2025-06-15T12:00:00Z')).toBe(true);
  });

  it('should use custom deadline hours', () => {
    // Game started 10 hours ago (at 10:00), with 12-hour deadline
    expect(isValidationClosed('2025-06-15T10:00:00Z', 12)).toBe(false);

    // Game started 10 hours ago (at 10:00), with 8-hour deadline
    expect(isValidationClosed('2025-06-15T10:00:00Z', 8)).toBe(true);
  });

  it('should return false for null game start time', () => {
    expect(isValidationClosed(null)).toBe(false);
  });

  it('should return false for undefined game start time', () => {
    expect(isValidationClosed(undefined)).toBe(false);
  });

  it('should return false for invalid date string', () => {
    expect(isValidationClosed('not-a-date')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidationClosed('')).toBe(false);
  });
});

describe('isGamePast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T14:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for game that has started', () => {
    expect(isGamePast('2025-06-15T12:00:00Z')).toBe(true);
  });

  it('should return true for game that started exactly now', () => {
    // Current time is 14:00, game also started at 14:00
    // The function uses >, so exactly now should be false
    expect(isGamePast('2025-06-15T14:00:00Z')).toBe(false);
  });

  it('should return false for future game', () => {
    expect(isGamePast('2025-06-15T16:00:00Z')).toBe(false);
  });

  it('should return false for game tomorrow', () => {
    expect(isGamePast('2025-06-16T14:00:00Z')).toBe(false);
  });

  it('should return false for null game start time', () => {
    expect(isGamePast(null)).toBe(false);
  });

  it('should return false for undefined game start time', () => {
    expect(isGamePast(undefined)).toBe(false);
  });

  it('should return false for invalid date string', () => {
    expect(isGamePast('invalid-date')).toBe(false);
  });
});

describe('isGameAlreadyValidated', () => {
  it('should return true when scoresheet closedAt is set', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: {
          scoresheet: {
            closedAt: '2025-06-15T20:00:00Z',
          },
        },
      },
    });
    expect(isGameAlreadyValidated(assignment)).toBe(true);
  });

  it('should return false when scoresheet closedAt is null', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: {
          scoresheet: {
            closedAt: null,
          },
        },
      },
    });
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });

  it('should return false when scoresheet is undefined', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: {
          scoresheet: undefined,
        },
      },
    });
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });

  it('should return false when game is undefined', () => {
    const assignment = createAssignment({
      refereeGame: {
        game: undefined,
      },
    });
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });

  it('should return false when refereeGame is undefined', () => {
    const assignment = createAssignment({
      refereeGame: undefined,
    });
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });
});

describe('isActionAvailable', () => {
  describe('calendar mode assignments', () => {
    it('should return false for all actions in calendar mode', () => {
      const calendarAssignment = createAssignment({
        refereeGame: {
          game: {
            group: {
              phase: {
                league: undefined,
              },
            },
          },
        },
      });

      expect(isActionAvailable(calendarAssignment, 'confirm')).toBe(false);
      expect(isActionAvailable(calendarAssignment, 'report')).toBe(false);
      expect(isActionAvailable(calendarAssignment, 'exchange')).toBe(false);
    });
  });

  describe('API-sourced assignments', () => {
    it('should return true for confirm action', () => {
      const assignment = createAssignment();
      expect(isActionAvailable(assignment, 'confirm')).toBe(true);
    });

    it('should return true for exchange action', () => {
      const assignment = createAssignment();
      expect(isActionAvailable(assignment, 'exchange')).toBe(true);
    });

    it('should return true for report action when eligible (NLA, head-one)', () => {
      const assignment = createAssignment({
        refereePosition: 'head-one',
        refereeGame: {
          game: {
            group: {
              phase: {
                league: {
                  leagueCategory: { name: 'NLA' },
                },
              },
            },
          },
        },
      });
      expect(isActionAvailable(assignment, 'report')).toBe(true);
    });

    it('should return false for report action when not eligible league', () => {
      const assignment = createAssignment({
        refereePosition: 'head-one',
        refereeGame: {
          game: {
            group: {
              phase: {
                league: {
                  leagueCategory: { name: '1L' },
                },
              },
            },
          },
        },
      });
      expect(isActionAvailable(assignment, 'report')).toBe(false);
    });

    it('should return false for report action when not head-one position', () => {
      const assignment = createAssignment({
        refereePosition: 'head-two',
        refereeGame: {
          game: {
            group: {
              phase: {
                league: {
                  leagueCategory: { name: 'NLA' },
                },
              },
            },
          },
        },
      });
      expect(isActionAvailable(assignment, 'report')).toBe(false);
    });
  });
});

describe('formatTeamMatchup', () => {
  it('should format team names with vs separator', () => {
    expect(formatTeamMatchup('Team A', 'Team B')).toBe('Team A vs Team B');
  });

  it('should handle TBD team names', () => {
    expect(formatTeamMatchup('TBD', 'TBD')).toBe('TBD vs TBD');
  });

  it('should handle long team names', () => {
    expect(formatTeamMatchup('VBC Züri Unterland', 'Volley Köniz')).toBe(
      'VBC Züri Unterland vs Volley Köniz'
    );
  });

  it('should handle empty strings', () => {
    expect(formatTeamMatchup('', '')).toBe(' vs ');
  });
});
