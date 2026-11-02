import { useEffect, useState } from "react";

// Instalação do AgilizaProf como aplicativo direto pelo navegador (PWA),
// sem passar pela Google Play ou App Store. No Android/Chrome o navegador
// entrega o evento `beforeinstallprompt`; no iPhone a instalação é feita
// pelo botão Compartilhar → "Adicionar à Tela de Início".

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let guardado: PromptEvent | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    guardado = e as PromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    guardado = null;
    avisar();
  });
}

export type Plataforma = "ios" | "android" | "computador";

function detectar(): Plataforma {
  if (typeof navigator === "undefined") return "computador";
  const ua = navigator.userAgent || "";
  const iPadOS =
    /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "computador";
}

export function appJaInstalado() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstalarApp() {
  const [, forcar] = useState(0);
  const [plataforma, setPlataforma] = useState<Plataforma>("computador");
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    setPlataforma(detectar());
    setInstalado(appJaInstalado());
    const f = () => {
      forcar((n) => n + 1);
      setInstalado(appJaInstalado());
    };
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);

  async function instalar(): Promise<boolean> {
    if (!guardado) return false;
    const ev = guardado;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    guardado = null;
    avisar();
    return outcome === "accepted";
  }

  return { plataforma, instalado, podeInstalarDireto: Boolean(guardado), instalar };
}
