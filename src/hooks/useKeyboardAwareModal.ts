import { useEffect, type RefObject } from "react";

/**
 * Adjusts a scrollable modal container so its footer stays visible above
 * the on-screen keyboard on mobile browsers (uses visualViewport API).
 *
 * - Caps the modal height to the visible viewport when the keyboard is open.
 * - Scrolls the focused input/textarea into view above the keyboard.
 */
export function useKeyboardAwareModal(
  modalRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const el = modalRef.current;
    if (!vv || !el) return;

    const apply = () => {
      const node = modalRef.current;
      if (!node) return;
      // Limit the modal to the visible viewport height so the footer can't
      // be pushed off-screen by the on-screen keyboard.
      node.style.maxHeight = `${Math.floor(vv.height)}px`;
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      // Wait a frame for the keyboard to start opening and viewport to settle.
      setTimeout(() => {
        try {
          target.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          target.scrollIntoView();
        }
      }, 250);
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    el.addEventListener("focusin", onFocusIn);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      el.removeEventListener("focusin", onFocusIn);
      const node = modalRef.current;
      if (node) node.style.maxHeight = "";
    };
  }, [enabled, modalRef]);
}