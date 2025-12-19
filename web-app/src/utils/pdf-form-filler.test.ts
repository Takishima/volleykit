import { describe, it, expect } from 'vitest';
import {
  extractSportsHallReportData,
  getLeagueCategoryFromAssignment,
} from './pdf-form-filler';
import type { Assignment } from '@/api/client';

describe('pdf-form-filler', () => {
  describe('extractSportsHallReportData', () => {
    it('extracts data from NLA assignment', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'referee-game-id',
          game: {
            __identity: 'game-id',
            number: 123456,
            startingDateTime: '2025-12-15T19:30:00.000Z',
            encounter: {
              __identity: 'encounter-id',
              teamHome: { __identity: 'th', name: 'VBC Zürich' },
              teamAway: { __identity: 'ta', name: 'Volley Luzern' },
            },
            hall: {
              __identity: 'hall-id',
              name: 'Sporthalle Hardau',
              primaryPostalAddress: {
                __identity: 'addr-id',
                city: 'Zürich',
              },
            },
            group: {
              __identity: 'group-id',
              phase: {
                __identity: 'phase-id',
                league: {
                  __identity: 'league-id',
                  gender: 'm',
                  leagueCategory: {
                    __identity: 'cat-id',
                    name: 'NLA',
                  },
                },
              },
            },
          },
          activeRefereeConvocationFirstHeadReferee: {
            indoorAssociationReferee: {
              indoorReferee: {
                person: {
                  __identity: 'person1',
                  firstName: 'Max',
                  lastName: 'Mustermann',
                  displayName: 'Max Mustermann',
                },
              },
            },
          },
          activeRefereeConvocationSecondHeadReferee: {
            indoorAssociationReferee: {
              indoorReferee: {
                person: {
                  __identity: 'person2',
                  firstName: 'Anna',
                  lastName: 'Schmidt',
                  displayName: 'Anna Schmidt',
                },
              },
            },
          },
        },
      };

      const result = extractSportsHallReportData(assignment);

      expect(result).toEqual({
        gameNumber: '123456',
        homeTeam: 'VBC Zürich',
        awayTeam: 'Volley Luzern',
        gender: 'm',
        hallName: 'Sporthalle Hardau',
        location: 'Zürich',
        date: '15.12.2025',
        firstRefereeName: 'Max Mustermann',
        secondRefereeName: 'Anna Schmidt',
      });
    });

    it('returns null for non-NLA/NLB leagues', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'referee-game-id',
          game: {
            __identity: 'game-id',
            group: {
              __identity: 'group-id',
              phase: {
                __identity: 'phase-id',
                league: {
                  __identity: 'league-id',
                  leagueCategory: {
                    __identity: 'cat-id',
                    name: '3L',
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSportsHallReportData(assignment);
      expect(result).toBeNull();
    });

    it('returns null when game is missing', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'referee-game-id',
        },
      };

      const result = extractSportsHallReportData(assignment);
      expect(result).toBeNull();
    });

    it('handles female league', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'referee-game-id',
          game: {
            __identity: 'game-id',
            number: 789,
            group: {
              __identity: 'group-id',
              phase: {
                __identity: 'phase-id',
                league: {
                  __identity: 'league-id',
                  gender: 'f',
                  leagueCategory: {
                    __identity: 'cat-id',
                    name: 'NLB',
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSportsHallReportData(assignment);
      expect(result?.gender).toBe('f');
    });
  });

  describe('getLeagueCategoryFromAssignment', () => {
    it('returns NLA for NLA league', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
        },
      };

      expect(getLeagueCategoryFromAssignment(assignment)).toBe('NLA');
    });

    it('returns NLB for NLB league', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLB' },
                },
              },
            },
          },
        },
      };

      expect(getLeagueCategoryFromAssignment(assignment)).toBe('NLB');
    });

    it('returns null for other leagues', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: '2L' },
                },
              },
            },
          },
        },
      };

      expect(getLeagueCategoryFromAssignment(assignment)).toBeNull();
    });
  });
});
