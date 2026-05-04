import { Sparkles, X, ArrowRight } from "lucide-react";
import { useSofia } from "./SofiaProvider";
import { useFocoDoDia } from "./useFocoDoDia";

const css = `
.sofia-foco{
  position:relative;
  background:linear-gradient(135deg,#1E1B2E 0%,#15131F 100%);
  border:1px solid #2A2438;border-radius:16px;
  padding:18px 20px;color:#fff;overflow:hidden;
  box-shadow:0 14px 36px rgba(15,13,30,.28);
  font-family:'Inter',-apple-system,sans-serif;
}
.sofia-foco::before{
  content:"";position:absolute;inset:-1px -1px auto auto;width:55%;height:140%;
  background:radial-gradient(circle at 90% 20%,rgba(249,115,22,.32) 0%,transparent 60%);
  pointer-events:none;
}
.sofia-foco > *{position:relative;z-index:1;}
.sf-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.sf-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);display:grid;place-items:center;color:#fff;flex-shrink:0;box-shadow:0 0 0 3px rgba(249,115,22,.18);}
.sf-title{font-size:12px;font-weight:700;color:#F97316;letter-spacing:.04em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.sf-close{margin-left:auto;background:transparent;border:0;color:rgba(255,255,255,.6);cursor:pointer;padding:4px;border-radius:6px;display:grid;place-items:center;}
.sf-close:hover{color:#fff;background:rgba(255,255,255,.08);}
.sf-body{font-size:15px;line-height:1.5;color:rgba(255,255,255,.95);font-weight:500;margin-bottom:6px;}
.sf-body b{color:#fff;font-weight:700;}
.sf-body em{color:#FDBA74;font-style:normal;font-weight:700;}
.sf-meta{font-size:12px;color:rgba(255,255,255,.55);margin-bottom:14px;}
.sf-meta b{color:#FDBA74;font-weight:700;}
.sf-action{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;border:0;font-weight:700;font-size:13px;cursor:pointer;transition:.18s;font-family:inherit;}
.sf-action:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(249,115,22,.4);}
.sofia-foco-empty{background:#FFF7EE;border:1px dashed #FFD8BF;color:#9A3F12;padding:14px 16px;border-radius:12px;font-size:13px;font-weight:600;}
`;

export function SofiaFocoCard({ showEmptyFallback = false }: { showEmptyFallback?: boolean }) {
  const sofia = useSofia();
  const { foco, dismiss } = useFocoDoDia();

  if (!foco.exibir) {
    if (!showEmptyFallback) return null;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="sofia-foco-empty">
          ✨ Nenhuma aula nas próximas horas. Que tal adiantar um parecer?
        </div>
      </>
    );
  }

  const { aluno, aula, sugestao, prompt_pre_preenchido } = foco;
  if (!aluno || !aula || !sugestao) return null;

  const handleAdaptar = () => {
    dismiss();
    sofia.openSofia({
      prompt: prompt_pre_preenchido,
      context: `Aluno: ${aluno.nome}${aluno.condicao ? ` (${aluno.condicao})` : ""} · Aula: ${aula.disciplina} (${aula.quando}) · ${sugestao.fonte}`,
      send: false,
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="sofia-foco" role="region" aria-label="Foco de hoje sugerido pela Sofia">
        <div className="sf-head">
          <div className="sf-av"><Sparkles size={16} /></div>
          <div className="sf-title">✨ Foco de hoje · sugerido pela IA</div>
          <button className="sf-close" onClick={dismiss} aria-label="Dispensar sugestão">
            <X size={14} />
          </button>
        </div>
        <div className="sf-body">
          <b>{aluno.nome}{aluno.condicao ? ` (${aluno.condicao})` : ""}</b> precisa de uma{" "}
          <em>{sugestao.tipo}</em> para a aula de <b>{aula.disciplina}</b> de {aula.quando}.{" "}
          A próxima aula {aluno.condicao ? "dele(a)" : "dele(a)"} é em <em>~{aula.tempo_restante}</em>.{" "}
          Quer que eu adapte agora?
        </div>
        <div className="sf-meta">
          ~<b>{sugestao.tempo_geracao}</b> para gerar · baseado {sugestao.fonte}
        </div>
        <button className="sf-action" onClick={handleAdaptar}>
          Adaptar agora <ArrowRight size={14} />
        </button>
      </div>
    </>
  );
}

export default SofiaFocoCard;