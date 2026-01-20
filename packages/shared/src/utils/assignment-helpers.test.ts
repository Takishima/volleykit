/**
 * Tests for assignment helper utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { components } from '../api/schema';
import {
  MODAL_CLEANUP_DELAY,
  isFromCalendarMode,
  extractTeamNames,
  getTeamNames,
  getTeamNamesFromCompensation,
  isGameReportEligible,
  isValidationEligible,
  DEFAULT_VALIDATION_DEADLINE_HOURS,
  isValidationClosed,
  isGamePast,
  isGameAlreadyValidated,
  isActionAvailable,
  formatTeamMatchup,
  type AssignmentAction,
} from './assignment-helpers';

type Assignment = components['schemas']['Assignment'];
type CompensationRecord = components['schemas']['CompensationRecord'];

// Helper to create a minimal assignment for testing
function createMockAssignment(
  overrides: Partial<{
    leagueCategoryName: string | undefined;
    refereePosition: string;
    hasLeague: boolean;
    gameStartTime: string;
    scoresheetClosedAt: string | null;
    homeTeam: string;
    awayTeam: string;
  }> = {}
): Assignment {
  const {
    leagueCategoryName = 'NLA',
    refereePosition = 'head-one',
    hasLeague = true,
    gameStartTime = '2025-01-15T14:00:00Z',
    scoresheetClosedAt = null,
    homeTeam = 'Team Home',
    awayTeam = 'Team Away',
  } = overrides;

  return {
    __identity: 'test-assignment-id',
    refereeConvocationStatus: 'active',
    refereePosition: refereePosition as Assignment['refereePosition'],
    refereeGame: {
      __identity: 'test-referee-game-id',
      game: {
        __identity: 'test-game-id',
        gameNumber: 12345,
        startingDateTime: gameStartTime,
        encounter: {
          teamHome: { name: homeTeam },
          teamAway: { name: awayTeam },
        },
        scoresheet: scoresheetClosedAt ? { closedAt: scoresheetClosedAt } : undefined,
        group: hasLeague
          ? {
              __identity: 'test-group-id',
              phase: {
                __identity: 'test-phase-id',
                league: leagueCategoryName
                  ? {
                      __identity: 'test-league-id',
                      leagueCategory: {
                        name: leagueCategoryName,
                      },
                    }
                  : undefined,
              },
            }
          : undefined,
      },
    },
  } as Assignment;
}

// Helper to create a minimal compensation record for testing
function createMockCompensation(
  overrides: Partial<{
    homeTeam: string;
    awayTeam: string;
  }> = {}
): CompensationRecord {
  const { homeTeam = 'Team Home', awayTeam = 'Team Away' } = overrides;

  return {
    __identity: 'test-compensation-id',
    refereeGame: {
      __identity: 'test-referee-game-id',
      game: {
        __identity: 'test-game-id',
        encounter: {
          teamHome: { name: homeTeam },
          teamAway: { name: awayTeam },
        },
      },
    },
  } as CompensationRecord;
}

describe('MODAL_CLEANUP_DELAY', () => {
  it('should be 300 milliseconds', () => {
    expect(MODAL_CLEANUP_DELAY).toBe(300);
  });
});

describe('DEFAULT_VALIDATION_DEADLINE_HOURS', () => {
  it('should be 6 hours', () => {
    expect(DEFAULT_VALIDATION_DEADLINE_HOURS).toBe(6);
  });
});

describe('isFromCalendarMode', () => {
  it('should return false for assignment with full league data', () => {
    const assignment = createMockAssignment({ hasLeague: true, leagueCategoryName: 'NLA' });
    expect(isFromCalendarMode(assignment)).toBe(false);
  });

  it('should return true for assignment without league data (calendar mode)', () => {
    const assignment = createMockAssignment({ hasLeague: false });
    expect(isFromCalendarMode(assignment)).toBe(true);
  });

  it('should return true when league object is missing from phase', () => {
    const assignment = createMockAssignment({ hasLeague: true, leagueCategoryName: undefined });
    // Force the league to be undefined
    if (assignment.refereeGame?.game?.group?.phase) {
      assignment.refereeGame.game.group.phase.league = undefined;
    }
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

  it('should return TBD for missing home team name', () => {
    const game = {
      encounter: {
        teamHome: {},
        teamAway: { name: 'Away Team' },
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'Away Team',
    });
  });

  it('should return TBD for missing away team name', () => {
    const game = {
      encounter: {
        teamHome: { name: 'Home Team' },
        teamAway: {},
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'Home Team',
      awayTeam: 'TBD',
    });
  });

  it('should return TBD for both teams when encounter is missing', () => {
    const game = {};
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });

  it('should return TBD for both teams when game is undefined', () => {
    expect(extractTeamNames(undefined)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });

  it('should return TBD for missing teamHome object', () => {
    const game = {
      encounter: {
        teamAway: { name: 'Away Team' },
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'Away Team',
    });
  });

  it('should return TBD for missing teamAway object', () => {
    const game = {
      encounter: {
        teamHome: { name: 'Home Team' },
      },
    };
    expect(extractTeamNames(game)).toEqual({
      homeTeam: 'Home Team',
      awayTeam: 'TBD',
    });
  });
});

describe('getTeamNames', () => {
  it('should extract team names from assignment', () => {
    const assignment = createMockAssignment({
      homeTeam: 'VBC Zurich',
      awayTeam: 'VBC Bern',
    });
    expect(getTeamNames(assignment)).toEqual({
      homeTeam: 'VBC Zurich',
      awayTeam: 'VBC Bern',
    });
  });

  it('should return TBD when game data is missing', () => {
    const assignment = { refereeGame: undefined } as Assignment;
    expect(getTeamNames(assignment)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });
});

describe('getTeamNamesFromCompensation', () => {
  it('should extract team names from compensation record', () => {
    const compensation = createMockCompensation({
      homeTeam: 'VBC Lausanne',
      awayTeam: 'VBC Geneva',
    });
    expect(getTeamNamesFromCompensation(compensation)).toEqual({
      homeTeam: 'VBC Lausanne',
      awayTeam: 'VBC Geneva',
    });
  });

  it('should return TBD when game data is missing', () => {
    const compensation = { refereeGame: undefined } as CompensationRecord;
    expect(getTeamNamesFromCompensation(compensation)).toEqual({
      homeTeam: 'TBD',
      awayTeam: 'TBD',
    });
  });
});

describe('isGameReportEligible', () => {
  it('should return true for NLA game with head-one position', () => {
    const assignment = createMockAssignment({
      leagueCategoryName: 'NLA',
      refereePosition: 'head-one',
    });
    expect(isGameReportEligible(assignment)).toBe(true);
  });

  it('should return true for NLB game with head-one position', () => {
    const assignment = createMockAssignment({
      leagueCategoryName: 'NLB',
      refereePosition: 'head-one',
    });
    expect(isGameReportEligible(assignment)).toBe(true);
  });

  it('should return false for NLA game with head-two position', () => {
    const assignment = createMockAssignment({
      leagueCategoryName: 'NLA',
      refereePosition: 'head-two',
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false for 1L game even with head-one position', () => {
    const assignment = createMockAssignment({
      leagueCategoryName: '1L',
      refereePosition: 'head-one',
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false for 2L game', () => {
    const assignment = createMockAssignment({
      leagueCategoryName: '2L',
      refereePosition: 'head-one',
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false for calendar mode assignments', () => {
    const assignment = createMockAssignment({
      hasLeague: false,
      refereePosition: 'head-one',
    });
    expect(isGameReportEligible(assignment)).toBe(false);
  });

  it('should return false when league category name is undefined', () => {
    const assignment = createMockAssignment({
      hasLeague: true,
      leagueCategoryName: undefined,
      refereePosition: 'head-one',
    });
    // Force the league category name to be undefined
    if (assignment.refereeGame?.game?.group?.phase?.league?.leagueCategory) {
      assignment.refereeGame.game.group.phase.league.leagueCategory.name = undefined as unknown as string;
    }
    expect(isGameReportEligible(assignment)).toBe(false);
  });
});

describe('isValidationEligible', () => {
  it('should return true for head-one position', () => {
    const assignment = createMockAssignment({ refereePosition: 'head-one' });
    expect(isValidationEligible(assignment)).toBe(true);
  });

  it('should return false for head-two position', () => {
    const assignment = createMockAssignment({ refereePosition: 'head-two' });
    expect(isValidationEligible(assignment)).toBe(false);
  });

  it('should return false for line referee position', () => {
    const assignment = createMockAssignment({ refereePosition: 'line-one' });
    expect(isValidationEligible(assignment)).toBe(false);
  });
});

describe('isValidationClosed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false for future game', () => {
    const futureTime = new Date('2025-01-20T14:00:00Z');
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    expect(isValidationClosed(futureTime.toISOString())).toBe(false);
  });

  it('should return false for game within validation window', () => {
    // Game started 3 hours ago, deadline is 6 hours
    vi.setSystemTime(new Date('2025-01-15T17:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isValidationClosed(gameStart, 6)).toBe(false);
  });

  it('should return false at exact deadline moment', () => {
    // Game started exactly 6 hours ago (at the deadline, validation is still open)
    vi.setSystemTime(new Date('2025-01-15T20:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isValidationClosed(gameStart, 6)).toBe(false);
  });

  it('should return true after deadline passes', () => {
    // Game started 7 hours ago, deadline is 6 hours
    vi.setSystemTime(new Date('2025-01-15T21:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isValidationClosed(gameStart, 6)).toBe(true);
  });

  it('should use default deadline of 6 hours', () => {
    // Game started 7 hours ago
    vi.setSystemTime(new Date('2025-01-15T21:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isValidationClosed(gameStart)).toBe(true);
  });

  it('should respect custom deadline hours', () => {
    // Game started 10 hours ago, custom deadline is 12 hours
    vi.setSystemTime(new Date('2025-01-16T00:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isValidationClosed(gameStart, 12)).toBe(false);
  });

  it('should return false for undefined game time', () => {
    expect(isValidationClosed(undefined)).toBe(false);
  });

  it('should return false for null game time', () => {
    expect(isValidationClosed(null)).toBe(false);
  });

  it('should return false for empty string game time', () => {
    expect(isValidationClosed('')).toBe(false);
  });

  it('should return false for invalid date string', () => {
    expect(isValidationClosed('not-a-date')).toBe(false);
  });
});

describe('isGamePast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for game that has started', () => {
    vi.setSystemTime(new Date('2025-01-15T15:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isGamePast(gameStart)).toBe(true);
  });

  it('should return false for future game', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isGamePast(gameStart)).toBe(false);
  });

  it('should return false at exact game start time', () => {
    vi.setSystemTime(new Date('2025-01-15T14:00:00Z'));
    const gameStart = '2025-01-15T14:00:00Z';
    expect(isGamePast(gameStart)).toBe(false);
  });

  it('should return false for undefined game time', () => {
    expect(isGamePast(undefined)).toBe(false);
  });

  it('should return false for null game time', () => {
    expect(isGamePast(null)).toBe(false);
  });

  it('should return false for invalid date string', () => {
    expect(isGamePast('invalid-date')).toBe(false);
  });
});

describe('isGameAlreadyValidated', () => {
  it('should return true when scoresheet has closedAt timestamp', () => {
    const assignment = createMockAssignment({
      scoresheetClosedAt: '2025-01-15T16:00:00Z',
    });
    expect(isGameAlreadyValidated(assignment)).toBe(true);
  });

  it('should return false when scoresheet has no closedAt', () => {
    const assignment = createMockAssignment({
      scoresheetClosedAt: null,
    });
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });

  it('should return false when scoresheet is undefined', () => {
    const assignment = createMockAssignment();
    if (assignment.refereeGame?.game) {
      assignment.refereeGame.game.scoresheet = undefined;
    }
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });

  it('should return false when game is undefined', () => {
    const assignment = { refereeGame: { game: undefined } } as Assignment;
    expect(isGameAlreadyValidated(assignment)).toBe(false);
  });
});

describe('isActionAvailable', () => {
  describe('confirm action', () => {
    it('should return true for API-sourced assignment', () => {
      const assignment = createMockAssignment({ hasLeague: true });
      expect(isActionAvailable(assignment, 'confirm')).toBe(true);
    });

    it('should return false for calendar mode assignment', () => {
      const assignment = createMockAssignment({ hasLeague: false });
      expect(isActionAvailable(assignment, 'confirm')).toBe(false);
    });
  });

  describe('report action', () => {
    it('should return true for eligible NLA game with head-one', () => {
      const assignment = createMockAssignment({
        hasLeague: true,
        leagueCategoryName: 'NLA',
        refereePosition: 'head-one',
      });
      expect(isActionAvailable(assignment, 'report')).toBe(true);
    });

    it('should return false for NLA game with head-two', () => {
      const assignment = createMockAssignment({
        hasLeague: true,
        leagueCategoryName: 'NLA',
        refereePosition: 'head-two',
      });
      expect(isActionAvailable(assignment, 'report')).toBe(false);
    });

    it('should return false for calendar mode assignment', () => {
      const assignment = createMockAssignment({ hasLeague: false });
      expect(isActionAvailable(assignment, 'report')).toBe(false);
    });

    it('should return false for lower league games', () => {
      const assignment = createMockAssignment({
        hasLeague: true,
        leagueCategoryName: '1L',
        refereePosition: 'head-one',
      });
      expect(isActionAvailable(assignment, 'report')).toBe(false);
    });
  });

  describe('exchange action', () => {
    it('should return true for API-sourced assignment', () => {
      const assignment = createMockAssignment({ hasLeague: true });
      expect(isActionAvailable(assignment, 'exchange')).toBe(true);
    });

    it('should return false for calendar mode assignment', () => {
      const assignment = createMockAssignment({ hasLeague: false });
      expect(isActionAvailable(assignment, 'exchange')).toBe(false);
    });
  });

  describe('type safety', () => {
    it('should handle all valid action types', () => {
      const assignment = createMockAssignment({ hasLeague: true, leagueCategoryName: 'NLA' });
      const actions: AssignmentAction[] = ['confirm', 'report', 'exchange'];

      for (const action of actions) {
        expect(() => isActionAvailable(assignment, action)).not.toThrow();
      }
    });
  });
});

describe('formatTeamMatchup', () => {
  it('should format team names as matchup string', () => {
    expect(formatTeamMatchup('VBC Zurich', 'VBC Bern')).toBe('VBC Zurich vs VBC Bern');
  });

  it('should handle TBD teams', () => {
    expect(formatTeamMatchup('TBD', 'TBD')).toBe('TBD vs TBD');
  });

  it('should handle empty strings', () => {
    expect(formatTeamMatchup('', '')).toBe(' vs ');
  });

  it('should handle special characters in team names', () => {
    expect(formatTeamMatchup('Team & Co.', 'Team "Best"')).toBe('Team & Co. vs Team "Best"');
  });
});
