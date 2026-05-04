import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { gerarFalaSofia } from "@/lib/sofia/gerarFala";
import { useSofia } from "./SofiaProvider";

const css = `
.sofia-active-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:100px;background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.32);color:#047857;font-size:11.5px;font-weight:700;cursor:pointer;transition:.18s;font-family:'Inter',sans-serif;}
.sofia-active-chip:hover{background:rgba(16,185,129,.16);transform:translateY(-1px);}
.sofia-active-chip .dot{width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,.18);animation:sac-pulse 2s infinite;}
.sofia-active-chip em{font-style:normal;color:#F97316;font-weight:800;}
@keyframes sac-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.4);}70%{box-shadow:0 0 0 8px rgba(16,185,129,0);}100%{box-shadow:0 0 0 0 rgba(16,185,129,0);}}
`;

export function SofiaActiveChip() {
  const ctx = useSofiaContext();
  const sofia = useSofia();
  const fala = gerarFalaSofia(ctx);
  if (!fala.contexto_chip) return null;
  const open = () => {
    const acaoPrompt = fala.acoes.find((a) => a.prompt)?.prompt;
    sofia.openSofia({ prompt: acaoPrompt, send: false });
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <button className="sofia-active-chip" onClick={open} aria-label="Abrir Sofia neste contexto">
        <span className="dot" />
        Sofia ativa · <em>{fala.contexto_chip}</em>
      </button>
    </>
  );
}
