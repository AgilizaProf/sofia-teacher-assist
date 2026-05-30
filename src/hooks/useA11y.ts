import { useEffect } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";

export type FontSizeMode = "normal" | "large" | "extra-large";
export type HighContrastMode = "off" | "on";

const ZOOM: Record<FontSizeMode, string> = {
  "normal": "1",
  "large": "1.15",
  "extra-large": "1.30",
};

export function useFontSize() {
  const [mode, setMode] = usePersistentState<FontSizeMode>("ui_font_size", "normal");
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.zoom = ZOOM[mode] ?? "1";
  }, [mode]);
  return { mode, setMode };
}

export function useHighContrast() {
  const [mode, setMode] = usePersistentState<HighContrastMode>("ui_high_contrast", "off");
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("high-contrast", mode === "on");
  }, [mode]);
  return { mode, setMode };
}
export type SofiaTipsMode = "on" | "off";

/**
 * Preferência: exibir (ou não) os cartões proativos de boas-vindas/dicas da
 * Sofia que aparecem ao navegar entre as páginas. Controla SOMENTE esses
 * cartões — chat, sugestões, geração e botão flutuante seguem intactos.
 */
export function useSofiaTips() {
  const [mode, setMode] = usePersistentState<SofiaTipsMode>("ui_sofia_tips", "on");
  return { mode, setMode };
}
