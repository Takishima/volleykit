/**
 * Nominations slice for demo store.
 * Handles nomination lists, possible players, and scorers data.
 */

import type { DemoState, DemoNominationsState } from './types'
import type { StateCreator } from 'zustand'

export interface NominationsSlice extends DemoNominationsState {
  updateNominationListClosed: (gameId: string, team: 'home' | 'away', closed: boolean) => void
  updateNominationListPlayers: (
    gameId: string,
    team: 'home' | 'away',
    playerNominationIds: string[]
  ) => void
}

export const createNominationsSlice: StateCreator<DemoState, [], [], NominationsSlice> = (
  set,
  _get,
  _api
) => ({
  nominationLists: {},
  possiblePlayers: [],
  scorers: [],

  updateNominationListClosed: (gameId: string, team: 'home' | 'away', closed: boolean) =>
    set((state) => {
      const gameNominations = state.nominationLists[gameId]
      if (!gameNominations) return state

      return {
        nominationLists: {
          ...state.nominationLists,
          [gameId]: {
            ...gameNominations,
            [team]: {
              ...gameNominations[team],
              closed,
              ...(closed && {
                closedAt: new Date().toISOString(),
                closedBy: 'referee',
              }),
            },
          },
        },
      }
    }),

  updateNominationListPlayers: (
    gameId: string,
    team: 'home' | 'away',
    playerNominationIds: string[]
  ) =>
    set((state) => {
      const gameNominations = state.nominationLists[gameId]
      if (!gameNominations) return state

      const nominationList = gameNominations[team]
      if (!nominationList) return state

      const existingNominations = nominationList.indoorPlayerNominations ?? []
      const existingById = new Map(existingNominations.map((n) => [n.__identity, n]))

      const possiblePlayersById = new Map(
        state.possiblePlayers.map((p) => [
          p.indoorPlayer?.__identity,
          {
            __identity: p.indoorPlayer?.__identity ?? '',
            person: p.indoorPlayer?.person,
            shirtNumber: 0,
          },
        ])
      )

      const newNominations = playerNominationIds
        .map((id) => existingById.get(id) ?? possiblePlayersById.get(id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined && n !== null)

      return {
        nominationLists: {
          ...state.nominationLists,
          [gameId]: {
            ...gameNominations,
            [team]: {
              ...nominationList,
              indoorPlayerNominations: newNominations,
            },
          },
        },
      }
    }),
})
