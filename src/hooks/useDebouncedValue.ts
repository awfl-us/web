import { useEffect, useState } from 'react'

/**
 * Returns a debounced version of the provided value after the given delay.
 * Useful for reducing re-computation (e.g., filtering) on fast user input.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
