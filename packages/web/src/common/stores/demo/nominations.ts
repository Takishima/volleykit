/**
 * Nominations slice for demo store.
 * Handles nomination lists, possible players, and scorers data.
 */

import type { IndoorPlayerNomination } from '@/api/client'

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

      // Keep the API nomination shape (`indoorPlayer.person`): the roster
      // readers build the display name from it and drop entries without one.
      const possiblePlayersById = new Map(
        state.possiblePlayers.map((p): [string | undefined, IndoorPlayerNomination] => [
          p.indoorPlayer?.__identity,
          {
            __identity: p.indoorPlayer?.__identity ?? '',
            indoorPlayer: p.indoorPlayer,
          },
        ])
      )

      const newNominations = playerNominationIds
        .map((id) => existingById.get(id) ?? possiblePlayersById.get(id))
        .filter((n) => n !== undefined)

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
