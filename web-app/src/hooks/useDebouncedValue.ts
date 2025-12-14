import { useState, useEffect } from "react";

const DEFAULT_DELAY_MS = 200;

/**
 * Hook that debounces a value, only updating after the specified delay
 * has passed without new changes.
 */
export function useDebouncedValue<T>(value: T, delayMs = DEFAULT_DELAY_MS): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
