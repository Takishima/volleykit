import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabNavigation } from "./useTabNavigation";

describe("useTabNavigation", () => {
  const tabs = ["tab1", "tab2", "tab3"] as const;
  const onTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTabProps return values", () => {
    it("should return correct role for all tabs", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const props1 = result.current.getTabProps("tab1", 0);
      const props2 = result.current.getTabProps("tab2", 1);
      const props3 = result.current.getTabProps("tab3", 2);

      expect(props1.role).toBe("tab");
      expect(props2.role).toBe("tab");
      expect(props3.role).toBe("tab");
    });

    it("should return correct aria-selected based on active tab", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab2",
          onTabChange,
        }),
      );

      const props1 = result.current.getTabProps("tab1", 0);
      const props2 = result.current.getTabProps("tab2", 1);
      const props3 = result.current.getTabProps("tab3", 2);

      expect(props1["aria-selected"]).toBe(false);
      expect(props2["aria-selected"]).toBe(true);
      expect(props3["aria-selected"]).toBe(false);
    });

    it("should return correct aria-controls and id", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const props = result.current.getTabProps("tab2", 1);

      expect(props.id).toBe("tab-tab2");
      expect(props["aria-controls"]).toBe("tabpanel-tab2");
    });

    it("should return correct tabIndex (0 for active, -1 for inactive)", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab2",
          onTabChange,
        }),
      );

      const props1 = result.current.getTabProps("tab1", 0);
      const props2 = result.current.getTabProps("tab2", 1);
      const props3 = result.current.getTabProps("tab3", 2);

      expect(props1.tabIndex).toBe(-1);
      expect(props2.tabIndex).toBe(0);
      expect(props3.tabIndex).toBe(-1);
    });

    it("should update tabIndex when active tab changes", () => {
      const { result, rerender } = renderHook(
        ({ activeTab }: { activeTab: (typeof tabs)[number] }) =>
          useTabNavigation({
            tabs,
            activeTab,
            onTabChange,
          }),
        { initialProps: { activeTab: "tab1" as (typeof tabs)[number] } },
      );

      let props1 = result.current.getTabProps("tab1", 0);
      let props2 = result.current.getTabProps("tab2", 1);

      expect(props1.tabIndex).toBe(0);
      expect(props2.tabIndex).toBe(-1);

      rerender({ activeTab: "tab2" });

      props1 = result.current.getTabProps("tab1", 0);
      props2 = result.current.getTabProps("tab2", 1);

      expect(props1.tabIndex).toBe(-1);
      expect(props2.tabIndex).toBe(0);
    });
  });

  describe("Arrow key navigation", () => {
    it("should move to next tab on ArrowRight", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const props = result.current.getTabProps("tab1", 0);
      const mockEvent = {
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props.onKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onTabChange).toHaveBeenCalledWith("tab2");
    });

    it("should move to previous tab on ArrowLeft", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab2",
          onTabChange,
        }),
      );

      const props = result.current.getTabProps("tab2", 1);
      const mockEvent = {
        key: "ArrowLeft",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props.onKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onTabChange).toHaveBeenCalledWith("tab1");
    });

    it("should wrap around to first tab when pressing ArrowRight on last tab", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab3",
          onTabChange,
        }),
      );

      const props = result.current.getTabProps("tab3", 2);
      const mockEvent = {
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props.onKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onTabChange).toHaveBeenCalledWith("tab1");
    });

    it("should wrap around to last tab when pressing ArrowLeft on first tab", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const props = result.current.getTabProps("tab1", 0);
      const mockEvent = {
        key: "ArrowLeft",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props.onKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onTabChange).toHaveBeenCalledWith("tab3");
    });

    it("should not trigger navigation for other keys", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const props = result.current.getTabProps("tab1", 0);
      const mockEvent = {
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props.onKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(onTabChange).not.toHaveBeenCalled();
    });
  });

  describe("Focus management", () => {
    it("should focus the newly selected tab on ArrowRight navigation", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const mockTab1Element = {
        focus: vi.fn(),
      } as unknown as HTMLButtonElement;

      const mockTab2Element = {
        focus: vi.fn(),
      } as unknown as HTMLButtonElement;

      const props1 = result.current.getTabProps("tab1", 0);
      const props2 = result.current.getTabProps("tab2", 1);

      act(() => {
        props1.ref(mockTab1Element);
        props2.ref(mockTab2Element);
      });

      const mockEvent = {
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props1.onKeyDown(mockEvent);
      });

      expect(mockTab2Element.focus).toHaveBeenCalled();
    });

    it("should focus the newly selected tab on ArrowLeft navigation", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab2",
          onTabChange,
        }),
      );

      const mockTab1Element = {
        focus: vi.fn(),
      } as unknown as HTMLButtonElement;

      const mockTab2Element = {
        focus: vi.fn(),
      } as unknown as HTMLButtonElement;

      const props1 = result.current.getTabProps("tab1", 0);
      const props2 = result.current.getTabProps("tab2", 1);

      act(() => {
        props1.ref(mockTab1Element);
        props2.ref(mockTab2Element);
      });

      const mockEvent = {
        key: "ArrowLeft",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props2.onKeyDown(mockEvent);
      });

      expect(mockTab1Element.focus).toHaveBeenCalled();
    });

    it("should clean up tab refs when element is unmounted", () => {
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: "tab1",
          onTabChange,
        }),
      );

      const mockTab1Element = {
        focus: vi.fn(),
      } as unknown as HTMLButtonElement;

      const props1 = result.current.getTabProps("tab1", 0);

      act(() => {
        props1.ref(mockTab1Element);
      });

      act(() => {
        props1.ref(null);
      });

      const mockEvent = {
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>;

      act(() => {
        props1.onKeyDown(mockEvent);
      });

      expect(onTabChange).toHaveBeenCalled();
    });
  });
});
