import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveAssociationCode } from "./useActiveAssociation";
import { useAuthStore, type Occupation, type UserProfile } from "@/stores/auth";

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
        isDemoMode: false,
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
});
