import { useEffect, useState } from "react";

/**
 * Returns `false` during SSR and the first client render, then `true`
 * after hydration completes. Use this to guard any UI that depends on
 * client-only state (e.g. the user's local time / timezone) so that the
 * server-rendered HTML always matches the first client paint and React
 * doesn't bail to the error boundary with a hydration mismatch.
 *
 * Example:
 *   const hydrated = useHydrated();
 *   const greeting = hydrated ? localGreeting() : "Olá";
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}