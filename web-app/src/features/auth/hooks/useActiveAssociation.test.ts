import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveAssociationCode } from "./useActiveAssociation";
import {
  useAuthStore,
  CALENDAR_ASSOCIATION,
  type Occupation,
  type UserProfile,
} from "@/shared/stores/auth";

function createOccupation(overrides: Partial<Occupation> = {}): Occupation {
  return {
    id: "occ-1",
    type: "referee",
    associationCode: "SV",
    ...overrides,
  };
}

function createUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    firstName: "John",
    lastName: "Doe",
    occupations: [createOccupation()],
    ...overrides,
  };
}

describe("useActiveAssociationCode", () => {
  beforeEach(() => {
    // Reset auth store to initial state before each test
    act(() => {
      useAuthStore.setState({
        status: "idle",
        user: null,
        error: null,
        csrfToken: null,
        dataSource: "api",
        calendarCode: null,
        activeOccupationId: null,
        isAssociationSwitching: false,
        _checkSessionPromise: null,
        eligibleAttributeValues: null,
        groupedEligibleAttributeValues: null,
        eligibleRoles: null,
      });
    });
  });

  it("returns undefined when user is null", () => {
    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBeUndefined();
  });

  it("returns undefined when user has no occupations", () => {
    act(() => {
      useAuthStore.setState({
        user: createUser({ occupations: [] }),
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBeUndefined();
  });

  it("returns first occupation's association code when no active occupation is set", () => {
    const occupations: Occupation[] = [
      createOccupation({ id: "occ-1", associationCode: "SV" }),
      createOccupation({ id: "occ-2", associationCode: "SVRBA" }),
    ];

    act(() => {
      useAuthStore.setState({
        user: createUser({ occupations }),
        activeOccupationId: null,
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBe("SV");
  });

  it("returns active occupation's association code when set", () => {
    const occupations: Occupation[] = [
      createOccupation({ id: "occ-1", associationCode: "SV" }),
      createOccupation({ id: "occ-2", associationCode: "SVRBA" }),
    ];

    act(() => {
      useAuthStore.setState({
        user: createUser({ occupations }),
        activeOccupationId: "occ-2",
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBe("SVRBA");
  });

  it("falls back to first occupation when active occupation id does not match", () => {
    const occupations: Occupation[] = [
      createOccupation({ id: "occ-1", associationCode: "SV" }),
      createOccupation({ id: "occ-2", associationCode: "SVRBA" }),
    ];

    act(() => {
      useAuthStore.setState({
        user: createUser({ occupations }),
        activeOccupationId: "non-existent-id",
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBe("SV");
  });

  it("returns undefined when occupation has no association code", () => {
    const occupations: Occupation[] = [
      createOccupation({ id: "occ-1", associationCode: undefined }),
    ];

    act(() => {
      useAuthStore.setState({
        user: createUser({ occupations }),
        activeOccupationId: "occ-1",
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBeUndefined();
  });

  it("updates when active occupation changes", () => {
    const occupations: Occupation[] = [
      createOccupation({ id: "occ-1", associationCode: "SV" }),
      createOccupation({ id: "occ-2", associationCode: "SVRBA" }),
    ];

    act(() => {
      useAuthStore.setState({
        user: createUser({ occupations }),
        activeOccupationId: "occ-1",
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBe("SV");

    act(() => {
      useAuthStore.setState({ activeOccupationId: "occ-2" });
    });

    expect(result.current).toBe("SVRBA");
  });

  it("updates when user changes", () => {
    act(() => {
      useAuthStore.setState({
        user: createUser({
          occupations: [createOccupation({ associationCode: "SV" })],
        }),
      });
    });

    const { result } = renderHook(() => useActiveAssociationCode());
    expect(result.current).toBe("SV");

    act(() => {
      useAuthStore.setState({
        user: createUser({
          occupations: [createOccupation({ associationCode: "VBCZ" })],
        }),
      });
    });

    expect(result.current).toBe("VBCZ");
  });

  describe("calendar mode", () => {
    it("returns CALENDAR_ASSOCIATION when dataSource is calendar", () => {
      const occupations: Occupation[] = [
        createOccupation({ id: "occ-1", associationCode: "SVRZ" }),
      ];

      act(() => {
        useAuthStore.setState({
          user: createUser({ occupations }),
          dataSource: "calendar",
          calendarCode: "ABC123",
        });
      });

      const { result } = renderHook(() => useActiveAssociationCode());
      expect(result.current).toBe(CALENDAR_ASSOCIATION);
    });

    it("returns CALENDAR_ASSOCIATION regardless of user occupations in calendar mode", () => {
      // Even with multiple occupations, calendar mode should use dummy association
      const occupations: Occupation[] = [
        createOccupation({ id: "occ-1", associationCode: "SV" }),
        createOccupation({ id: "occ-2", associationCode: "SVRBA" }),
      ];

      act(() => {
        useAuthStore.setState({
          user: createUser({ occupations }),
          dataSource: "calendar",
          calendarCode: "XYZ789",
          activeOccupationId: "occ-2",
        });
      });

      const { result } = renderHook(() => useActiveAssociationCode());
      expect(result.current).toBe(CALENDAR_ASSOCIATION);
    });

    it("returns CALENDAR_ASSOCIATION even with no user in calendar mode", () => {
      act(() => {
        useAuthStore.setState({
          user: null,
          dataSource: "calendar",
          calendarCode: "ABC123",
        });
      });

      const { result } = renderHook(() => useActiveAssociationCode());
      expect(result.current).toBe(CALENDAR_ASSOCIATION);
    });

    it("returns real association when switching from calendar to api mode", () => {
      const occupations: Occupation[] = [
        createOccupation({ id: "occ-1", associationCode: "SVRZ" }),
      ];

      act(() => {
        useAuthStore.setState({
          user: createUser({ occupations }),
          dataSource: "calendar",
          calendarCode: "ABC123",
        });
      });

      const { result } = renderHook(() => useActiveAssociationCode());
      expect(result.current).toBe(CALENDAR_ASSOCIATION);

      // Switch to API mode
      act(() => {
        useAuthStore.setState({
          dataSource: "api",
          calendarCode: null,
        });
      });

      expect(result.current).toBe("SVRZ");
    });
  });
});
