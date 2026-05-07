import { useEffect } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";

/**
 * App-level "reduce motion" preference. Stored locally and applied by
 * toggling the `reduce-motion` class on <html>. CSS in src/styles.css
 * neutralizes animations/transitions when either:
 *   - the OS preference (prefers-reduced-motion: reduce) is on, OR
 *   - this app-level toggle is enabled.
 */
export type ReducedMotionMode = "system" | "on" | "off";

export function useReducedMotion() {
  const [mode, setMode] = usePersistentState<ReducedMotionMode>(
    "ui_reduce_motion",
    "system",
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const sys = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const on = mode === "on" || (mode === "system" && sys);
      root.classList.toggle("reduce-motion", on);
    };
    apply();
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mq?.addEventListener?.("change", apply);
    return () => { mq?.removeEventListener?.("change", apply); };
  }, [mode]);

  return { mode, setMode };
}