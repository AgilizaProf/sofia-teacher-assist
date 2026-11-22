import { useEffect, useRef, useState } from "react";

// Botão de microfone: a professora fala e o texto entra no campo.
// Usa o reconhecimento de fala do navegador (Chrome, Edge, Safari e o app no
// celular). Onde o navegador não oferece, o botão não aparece.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reconhecedor = any;

function criarReconhecedor(): Reconhecedor | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const R = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!R) return null;
  const r = new R();
  r.lang = "pt-BR";
  r.interimResults = false;
  r.continuous = true;
  return r;
}

/** Junta o texto ditado ao que já estava escrito, com espaço no meio. */
export function juntarDitado(atual: string, falado: string): string {
  const f = falado.trim();
  if (!f) return atual;
  if (!atual.trim()) return f.charAt(0).toUpperCase() + f.slice(1);
  return /\s$/.test(atual) ? atual + f : `${atual} ${f}`;
}

export function BotaoDitado({
  onTexto,
  rotulo = "Ditar por voz",
  compacto = false,
}: {
  /** Recebe só o trecho falado; quem usa junta ao texto (veja juntarDitado). */
  onTexto: (falado: string) => void;
  rotulo?: string;
  compacto?: boolean;
}) {
  const [pode, setPode] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const rec = useRef<Reconhecedor | null>(null);
  const cb = useRef(onTexto);
  cb.current = onTexto;

  useEffect(() => {
    setPode(!!criarReconhecedor());
    return () => {
      try {
        rec.current?.stop?.();
      } catch {
        /* já parou */
      }
    };
  }, []);

  if (!pode) return null;

  const alternar = () => {
    if (ouvindo) {
      rec.current?.stop?.();
      return;
    }
    const r = criarReconhecedor();
    if (!r) return;
    rec.current = r;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) cb.current(e.results[i][0].transcript as string);
      }
    };
    r.onend = () => setOuvindo(false);
    r.onerror = () => setOuvindo(false);
    setOuvindo(true);
    try {
      r.start();
    } catch {
      setOuvindo(false);
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={ouvindo}
      aria-label={ouvindo ? "Parar de ouvir" : rotulo}
      title={ouvindo ? "Parar de ouvir" : rotulo}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: compacto ? "0 8px" : "0 12px",
        borderRadius: 8,
        border: `1.5px solid ${ouvindo ? "#14161F" : "#D6DBE5"}`,
        background: ouvindo ? "#FF6B5C" : "#fff",
        color: ouvindo ? "#fff" : "#14161F",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        flex: "none",
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
      </svg>
      {!compacto && (ouvindo ? "Ouvindo… toque para parar" : "Ditar")}
    </button>
  );
}
