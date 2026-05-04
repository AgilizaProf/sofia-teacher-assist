import { useSofia } from "./SofiaProvider";

const css = `
.sofia-ctx-chip{
  display:inline-flex;align-items:center;gap:8px;
  padding:6px 12px 6px 10px;border-radius:999px;
  background:#FFF4EC;border:1px solid #FFD8BF;
  color:#9A3F12;font-size:12px;font-weight:600;
  font-family:'Inter',-apple-system,sans-serif;
  cursor:pointer;transition:.15s;line-height:1;
  white-space:nowrap;
}
.sofia-ctx-chip:hover{
  background:#FFE7D6;border-color:#F97316;
  box-shadow:0 4px 14px rgba(249,115,22,.18);
  transform:translateY(-1px);
}
.sofia-ctx-chip .dot{
  width:8px;height:8px;border-radius:50%;
  background:#22C55E;
  box-shadow:0 0 0 3px rgba(34,197,94,.18),0 0 6px #22C55E;
  flex-shrink:0;
}
.sofia-ctx-chip .lbl b{font-weight:700;color:#7A2E08;}
.sofia-ctx-chip .lbl em{font-style:normal;color:#9A3F12;font-weight:500;}
.sofia-ctx-chip .lbl span{color:#C2410C;font-weight:700;}
`;

export type SofiaContextChipProps = {
  /** Texto descritivo do contexto (ex.: "PEI do João", "plano da semana 12"). */
  context: string;
  /** Pergunta/sugestão que deve aparecer já no input ao abrir a Tray. */
  suggestion: string;
  /** Contexto adicional invisível enviado junto à mensagem. */
  hiddenContext?: string;
  className?: string;
};

export function SofiaContextChip({ context, suggestion, hiddenContext, className }: SofiaContextChipProps) {
  const sofia = useSofia();
  const handle = () => {
    sofia.openSofia({ prompt: suggestion, context: hiddenContext ?? context });
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <button
        type="button"
        onClick={handle}
        className={"sofia-ctx-chip" + (className ? " " + className : "")}
        aria-label={`Abrir Sofia · ${context}`}
        title="Clique para abrir a Sofia com uma sugestão deste contexto"
      >
        <span className="dot" aria-hidden />
        <span className="lbl">
          <b>Sofia ativa</b> <em>· vendo</em> <span>{context}</span>
        </span>
      </button>
    </>
  );
}

export default SofiaContextChip;