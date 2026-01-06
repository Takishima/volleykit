import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useValidationState } from "./useValidationState";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import type { RosterPlayer } from "@/features/validation/hooks/useNominationList";
import * as authStore from "@/shared/stores/auth";
import * as apiClient from "@/api/client";

vi.mock("@/shared/stores/auth");
vi.mock("@/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/client")>();
  return {
    ...original,
    getApiClient: vi.fn(),
  };
});

const mockScorer: ValidatedPersonSearchResult = {
  __identity: "scorer-1",
  displayName: "John Scorer",
  firstName: "John",
  lastName: "Scorer",
};

const mockGameDetails = {
  __identity: "game-1",
  nominationListOfTeamHome: {
    __identity: "nomlist-home",
    team: { __identity: "team-home" },
    indoorPlayerNominations: [
      { __identity: "player-1" },
      { __identity: "player-2" },
    ],
    nominationListValidation: { __identity: "validation-home" },
  },
  nominationListOfTeamAway: {
    __identity: "nomlist-away",
    team: { __identity: "team-away" },
    indoorPlayerNominations: [{ __identity: "player-3" }],
    nominationListValidation: { __identity: "validation-away" },
  },
  scoresheet: {
    __identity: "scoresheet-1",
    isSimpleScoresheet: false,
    scoresheetValidation: { __identity: "validation-scoresheet" },
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("useValidationState", () => {
  const mockGetGameWithScoresheet = vi.fn();
  const mockUpdateNominationList = vi.fn();
  const mockUpdateScoresheet = vi.fn();
  const mockFinalizeNominationList = vi.fn();
  const mockFinalizeScoresheet = vi.fn();
  const mockUploadResource = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: "api" } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(apiClient.getApiClient).mockReturnValue({
      getGameWithScoresheet: mockGetGameWithScoresheet,
      updateNominationList: mockUpdateNominationList,
      updateScoresheet: mockUpdateScoresheet,
      finalizeNominationList: mockFinalizeNominationList,
      finalizeScoresheet: mockFinalizeScoresheet,
      uploadResource: mockUploadResource,
    } as unknown as ReturnType<typeof apiClient.getApiClient>);

    mockGetGameWithScoresheet.mockResolvedValue(mockGameDetails);
  });

  describe("initial state", () => {
    it("starts with empty state", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.state.homeRoster.reviewed).toBe(false);
      expect(result.current.state.homeRoster.playerModifications).toEqual({
        added: [],
        removed: [],
      });
      expect(result.current.state.awayRoster.reviewed).toBe(false);
      expect(result.current.state.scorer.selected).toBeNull();
      expect(result.current.state.scoresheet.file).toBeNull();
      expect(result.current.state.scoresheet.uploaded).toBe(false);
    });

    it("is not dirty initially", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isDirty).toBe(false);
    });

    it("has incomplete status initially", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.completionStatus).toEqual({
        homeRoster: false,
        awayRoster: false,
        scorer: false,
        scoresheet: true, // Always true (optional)
      });
      expect(result.current.isAllRequiredComplete).toBe(false);
    });

    it("is not saving or finalizing initially", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSaving).toBe(false);
      expect(result.current.isFinalizing).toBe(false);
    });
  });

  describe("roster modifications", () => {
    it("updates home roster modifications and marks as reviewed", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      const newPlayer: RosterPlayer = { id: "new-player", displayName: "New Player" };
      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [newPlayer], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      expect(result.current.state.homeRoster.playerModifications.added).toHaveLength(
        1,
      );
      expect(result.current.state.homeRoster.reviewed).toBe(true);
      expect(result.current.completionStatus.homeRoster).toBe(true);
    });

    it("updates away roster modifications and marks as reviewed", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAwayRosterModifications({
          players: { added: [], removed: ["player-to-remove"] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      expect(
        result.current.state.awayRoster.playerModifications.removed,
      ).toHaveLength(1);
      expect(result.current.state.awayRoster.reviewed).toBe(true);
      expect(result.current.completionStatus.awayRoster).toBe(true);
    });

    it("marks state as dirty when roster has modifications", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [{ id: "player", displayName: "Player" }], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("scorer selection", () => {
    it("sets the selected scorer", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScorer(mockScorer);
      });

      expect(result.current.state.scorer.selected).toEqual(mockScorer);
      expect(result.current.completionStatus.scorer).toBe(true);
    });

    it("can clear the scorer", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScorer(mockScorer);
      });

      act(() => {
        result.current.setScorer(null);
      });

      expect(result.current.state.scorer.selected).toBeNull();
      expect(result.current.completionStatus.scorer).toBe(false);
    });

    it("marks state as dirty when scorer is selected", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setScorer(mockScorer);
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("scoresheet handling", () => {
    it("sets the scoresheet file", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      const file = new File(["content"], "scoresheet.pdf", {
        type: "application/pdf",
      });

      act(() => {
        result.current.setScoresheet(file, false);
      });

      expect(result.current.state.scoresheet.file).toBe(file);
      expect(result.current.state.scoresheet.uploaded).toBe(false);
    });

    it("updates uploaded status", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      const file = new File(["content"], "scoresheet.pdf", {
        type: "application/pdf",
      });

      act(() => {
        result.current.setScoresheet(file, true);
      });

      expect(result.current.state.scoresheet.uploaded).toBe(true);
    });

    it("marks state as dirty when file is set", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      const file = new File(["content"], "scoresheet.pdf", {
        type: "application/pdf",
      });

      act(() => {
        result.current.setScoresheet(file, false);
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("completion status", () => {
    it("isAllRequiredComplete is true when all required panels are complete", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      // Set all required fields
      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setAwayRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
      });

      expect(result.current.isAllRequiredComplete).toBe(true);
    });

    it("isAllRequiredComplete is false when scorer is missing", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setAwayRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      expect(result.current.isAllRequiredComplete).toBe(false);
    });

    it("scoresheet completion is always true (optional)", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.completionStatus.scoresheet).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      // Make some changes
      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [{ id: "p1", displayName: "Player 1" }], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
        result.current.setScoresheet(
          new File([""], "test.pdf"),
          true,
        );
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.homeRoster.reviewed).toBe(false);
      expect(result.current.state.homeRoster.playerModifications).toEqual({
        added: [],
        removed: [],
      });
      expect(result.current.state.scorer.selected).toBeNull();
      expect(result.current.state.scoresheet.file).toBeNull();
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe("game details loading", () => {
    it("fetches game details when gameId is provided", async () => {
      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      expect(mockGetGameWithScoresheet).toHaveBeenCalledWith("game-123");
    });

    it("does not fetch when gameId is not provided", () => {
      renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      expect(mockGetGameWithScoresheet).not.toHaveBeenCalled();
    });

    it("exposes game details error", async () => {
      mockGetGameWithScoresheet.mockRejectedValue(new Error("Failed to load"));

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.gameDetailsError).not.toBeNull();
      });

      expect(result.current.gameDetailsError?.message).toBe("Failed to load");
    });
  });

  describe("saveProgress", () => {
    it("saves roster modifications to API", async () => {
      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      // Wait for game details to load
      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      // Make modifications
      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [{ id: "new-player", displayName: "New Player" }], removed: ["player-1"] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      // Save
      await act(async () => {
        await result.current.saveProgress();
      });

      expect(mockUpdateNominationList).toHaveBeenCalled();
    });

    it("saves scorer selection to API", async () => {
      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setScorer(mockScorer);
      });

      await act(async () => {
        await result.current.saveProgress();
      });

      expect(mockUpdateScoresheet).toHaveBeenCalledWith(
        "scoresheet-1",
        "game-123",
        "scorer-1",
        false,
      );
    });

    it("sets isSaving during save operation", async () => {
      mockUpdateNominationList.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [{ id: "player", displayName: "Player" }], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveProgress();
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        await savePromise;
      });

      expect(result.current.isSaving).toBe(false);
    });

    it("prevents concurrent saves", async () => {
      mockUpdateNominationList.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [{ id: "player", displayName: "Player" }], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
      });

      // Start two saves simultaneously
      let save1: Promise<void>;
      let save2: Promise<void>;

      act(() => {
        save1 = result.current.saveProgress();
        save2 = result.current.saveProgress();
      });

      await act(async () => {
        await Promise.all([save1, save2]);
      });

      // Should only call API once due to guard
      expect(mockUpdateNominationList).toHaveBeenCalledTimes(1);
    });

    it("skips save when no gameId", async () => {
      const { result } = renderHook(() => useValidationState(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.saveProgress();
      });

      expect(mockUpdateNominationList).not.toHaveBeenCalled();
      expect(mockUpdateScoresheet).not.toHaveBeenCalled();
    });
  });

  describe("finalizeValidation", () => {
    it("uploads scoresheet file if provided", async () => {
      mockUploadResource.mockResolvedValue([{ __identity: "resource-1" }]);

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      const file = new File(["content"], "scoresheet.pdf", {
        type: "application/pdf",
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setAwayRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
        result.current.setScoresheet(file, false);
      });

      await act(async () => {
        await result.current.finalizeValidation();
      });

      expect(mockUploadResource).toHaveBeenCalledWith(file);
    });

    it("finalizes nomination lists", async () => {
      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setAwayRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
      });

      await act(async () => {
        await result.current.finalizeValidation();
      });

      expect(mockFinalizeNominationList).toHaveBeenCalledTimes(2);
    });

    it("sets isFinalizing during operation", async () => {
      mockFinalizeNominationList.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
      });

      let finalizePromise: Promise<void>;
      act(() => {
        finalizePromise = result.current.finalizeValidation();
      });

      expect(result.current.isFinalizing).toBe(true);

      await act(async () => {
        await finalizePromise;
      });

      expect(result.current.isFinalizing).toBe(false);
    });

    it("prevents concurrent finalizations", async () => {
      mockFinalizeNominationList.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
      });

      let f1: Promise<void>;
      let f2: Promise<void>;

      act(() => {
        f1 = result.current.finalizeValidation();
        f2 = result.current.finalizeValidation();
      });

      await act(async () => {
        await Promise.all([f1, f2]);
      });

      // Should only finalize once due to guard
      expect(mockFinalizeNominationList).toHaveBeenCalledTimes(2); // 2 for home + away, not 4
    });

    it("throws error on API failure", async () => {
      mockFinalizeNominationList.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useValidationState("game-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGameDetails).toBe(false);
      });

      act(() => {
        result.current.setHomeRosterModifications({
          players: { added: [], removed: [] },
          coaches: { added: new Map(), removed: new Set() },
        });
        result.current.setScorer(mockScorer);
      });

      await expect(
        act(async () => {
          await result.current.finalizeValidation();
        }),
      ).rejects.toThrow("API Error");
    });
  });
});
