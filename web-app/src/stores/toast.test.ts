import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore, toast, DEFAULT_DURATION_MS } from "./toast";

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
});

describe("useToastStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty toasts array", () => {
      const { toasts } = useToastStore.getState();
      expect(toasts).toEqual([]);
    });
  });

  describe("addToast", () => {
    it("adds a toast to the store", () => {
      const { addToast } = useToastStore.getState();

      addToast({ message: "Test message", type: "success" });

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe("Test message");
      expect(toasts[0].type).toBe("success");
    });

    it("returns the toast id", () => {
      const { addToast } = useToastStore.getState();

      const id = addToast({ message: "Test message", type: "info" });

      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
    });

    it("assigns unique ids to each toast", () => {
      const { addToast } = useToastStore.getState();

      const id1 = addToast({ message: "First", type: "success" });
      const id2 = addToast({ message: "Second", type: "error" });

      expect(id1).not.toBe(id2);
    });

    it("preserves custom duration", () => {
      const { addToast } = useToastStore.getState();

      addToast({ message: "Test", type: "warning", duration: 10000 });

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(10000);
    });

    it("limits toasts to MAX_TOASTS (5)", () => {
      const { addToast } = useToastStore.getState();

      // Add 7 toasts
      for (let i = 0; i < 7; i++) {
        addToast({ message: `Toast ${i}`, type: "info" });
      }

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(5);
      // Should keep the last 5 toasts
      expect(toasts[0].message).toBe("Toast 2");
      expect(toasts[4].message).toBe("Toast 6");
    });
  });

  describe("removeToast", () => {
    it("removes a toast by id", () => {
      const { addToast, removeToast } = useToastStore.getState();

      const id = addToast({ message: "To be removed", type: "error" });
      removeToast(id);

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(0);
    });

    it("only removes the specified toast", () => {
      const { addToast, removeToast } = useToastStore.getState();

      addToast({ message: "First", type: "success" });
      const id2 = addToast({ message: "Second", type: "error" });
      addToast({ message: "Third", type: "info" });

      removeToast(id2);

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(2);
      expect(toasts.find((t) => t.message === "Second")).toBeUndefined();
    });

    it("does nothing when removing non-existent id", () => {
      const { addToast, removeToast } = useToastStore.getState();

      addToast({ message: "Test", type: "info" });
      removeToast("non-existent-id");

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
    });
  });

  describe("clearToasts", () => {
    it("removes all toasts", () => {
      const { addToast, clearToasts } = useToastStore.getState();

      addToast({ message: "First", type: "success" });
      addToast({ message: "Second", type: "error" });
      addToast({ message: "Third", type: "warning" });

      clearToasts();

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(0);
    });

    it("works on empty store", () => {
      const { clearToasts } = useToastStore.getState();

      clearToasts();

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(0);
    });
  });
});

describe("toast convenience functions", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  describe("toast.success", () => {
    it("adds a success toast", () => {
      toast.success("Operation successful");

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("success");
      expect(toasts[0].message).toBe("Operation successful");
    });

    it("uses default duration", () => {
      toast.success("Test");

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(DEFAULT_DURATION_MS);
    });

    it("accepts custom duration", () => {
      toast.success("Test", 3000);

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(3000);
    });

    it("returns the toast id", () => {
      const id = toast.success("Test");

      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
    });
  });

  describe("toast.error", () => {
    it("adds an error toast", () => {
      toast.error("Something went wrong");

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("error");
      expect(toasts[0].message).toBe("Something went wrong");
    });

    it("uses default duration", () => {
      toast.error("Test");

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(DEFAULT_DURATION_MS);
    });

    it("accepts custom duration", () => {
      toast.error("Test", 10000);

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(10000);
    });

    it("returns the toast id", () => {
      const id = toast.error("Test");

      expect(id).toBeDefined();
    });
  });

  describe("toast.info", () => {
    it("adds an info toast", () => {
      toast.info("Information message");

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("info");
      expect(toasts[0].message).toBe("Information message");
    });

    it("uses default duration", () => {
      toast.info("Test");

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(DEFAULT_DURATION_MS);
    });

    it("accepts custom duration", () => {
      toast.info("Test", 2000);

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(2000);
    });

    it("returns the toast id", () => {
      const id = toast.info("Test");

      expect(id).toBeDefined();
    });
  });

  describe("toast.warning", () => {
    it("adds a warning toast", () => {
      toast.warning("Warning message");

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("warning");
      expect(toasts[0].message).toBe("Warning message");
    });

    it("uses default duration", () => {
      toast.warning("Test");

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(DEFAULT_DURATION_MS);
    });

    it("accepts custom duration", () => {
      toast.warning("Test", 7000);

      const { toasts } = useToastStore.getState();
      expect(toasts[0].duration).toBe(7000);
    });

    it("returns the toast id", () => {
      const id = toast.warning("Test");

      expect(id).toBeDefined();
    });
  });
});
