import { useMemo } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useSofia } from "./SofiaProvider";
import { useHydrated } from "@/hooks/useHydrated";
import { CID_OPTIONS } from "@/lib/cidsBR";
import { useDashStudents } from "@/hooks/useDashLegacyData";

type DashStudent = { id?: string; name: string; classRef: string; birth: string; pcd: string; notes: string; createdAt?: string };
type Variant = "port" | "mat" | "aval" | "esc" | "ci";
type Card = { id: string; v: Variant; tag: string; title: string; meta: string; locked?: boolean };
type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";
type Week = Record<DayKey, Card[]>;
const EMPTY_WEEK: Week = { seg: [], ter: [], qua: [], qui: [], sex: [] };

const DISCIPLINA_BY_V: Record<Variant, string> = {
  port: "Português", mat: "Matemática", ci: "Ciências",
  aval: "Avaliação", esc: "Escrita",
};

const WEEKDAY_TO_KEY: Record<number, DayKey | null> = {
  0: "seg", // dom → próxima escolar é seg
  1: "ter", 2: "qua", 3: "qui", 4: "sex",
  5: "seg", // sex à noite → seg
  6: "seg", // sáb → seg
};

function tomorrowKey(): DayKey {
  const d = new Date();
  return WEEKDAY_TO_KEY[d.getDay()] ?? "seg";
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function necessidadeLabel(pcd: string): string {
  const o = CID_OPTIONS.find((c) => c.value === pcd);
  if (!o) return "Necessidade específica";
  return o.label.split("—")[0].trim();
}

function studentId(s: DashStudent): string {
  if (s.id) return s.id;
  return `dash-${(s.createdAt || s.name).replace(/\s+/g, "-")}-${s.name.toLowerCase().replace(/\s+/g, "-")}`;
}

const css = `
.sofia-adapt{position:relative;background:linear-gradient(135deg,#1E1B2E 0%,#15131F 100%);
  border:1px solid #2A2438;border-radius:16px;padding:18px 20px;color:#fff;overflow:hidden;
  box-shadow:0 14px 36px rgba(15,13,30,.28);font-family:'Inter',-apple-system,sans-serif;}
.sofia-adapt::before{content:"";position:absolute;inset:-1px -1px auto auto;width:55%;height:140%;
  background:radial-gradient(circle at 90% 20%,rgba(139,92,246,.32) 0%,transparent 60%);pointer-events:none;}
.sofia-adapt > *{position:relative;z-index:1;}
.sa-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.sa-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#6D28D9);
  display:grid;place-items:center;color:#fff;flex-shrink:0;box-shadow:0 0 0 3px rgba(139,92,246,.18);}
.sa-title{font-size:12px;font-weight:700;color:#C4B5FD;letter-spacing:.04em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.sa-body{font-size:15px;line-height:1.5;color:rgba(255,255,255,.95);font-weight:500;margin-bottom:6px;}
.sa-body b{color:#fff;font-weight:700;}
.sa-body em{color:#FDBA74;font-style:normal;font-weight:700;}
.sa-meta{font-size:12px;color:rgba(255,255,255,.55);margin-bottom:14px;}
.sa-meta b{color:#FDBA74;font-weight:700;}
.sa-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.sa-action{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;
  background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;border:0;font-weight:700;font-size:13px;
  cursor:pointer;transition:.18s;font-family:inherit;}
.sa-action:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(139,92,246,.4);}
.sa-stack{display:inline-flex;align-items:center;gap:0;cursor:pointer;background:transparent;border:0;padding:4px 8px;border-radius:999px;transition:background .15s;}
.sa-stack:hover{background:rgba(255,255,255,.06);}
.sa-stack-av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;
  font-size:11px;font-weight:800;border:2px solid #15131F;margin-left:-8px;
  background:linear-gradient(135deg,#F97316,#EA580C);font-family:'Inter';}
.sa-stack-av:first-child{margin-left:0;}
.sa-stack-av.more{background:rgba(255,255,255,.12);color:rgba(255,255,255,.85);}
.sa-stack-text{font-size:11.5px;color:rgba(255,255,255,.7);margin-left:8px;font-weight:600;}
.sofia-adapt-empty{background:#F3FAF6;border:1px dashed #C8E6D2;color:#0E7A4F;padding:14px 16px;
  border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;}
`;

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

export function SofiaAdaptacaoCard({ showEmptyFallback = false }: { showEmptyFallback?: boolean }) {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const sofia = useSofia();
  const dashStudents = useDashStudents();
  const [week] = usePersistentState<Week>("plan_week", EMPTY_WEEK);
  const [adaptDone] = usePersistentState<Record<string, string[]>>("inc_adapt_done", {});
  const [incPlans] = usePersistentState<Record<string, Array<{ data?: string; disciplina?: string }>>>("inc_plans", {});

  const result = useMemo(() => {
    if (!hydrated) return { pendentes: [] as Array<{ id: string; nome: string; necessidade: string; disciplina: string; turma: string }> };
    const safeWeek: Week = (week && typeof week === "object") ? { ...EMPTY_WEEK, ...week } : EMPTY_WEEK;
    const safeDash: DashStudent[] = Array.isArray(dashStudents) ? dashStudents : [];
    const safeAdapt: Record<string, string[]> = (adaptDone && typeof adaptDone === "object") ? adaptDone : {};
    const safePlans: Record<string, Array<{ data?: string; disciplina?: string }>> = (incPlans && typeof incPlans === "object") ? incPlans : {};
    const dayKey = tomorrowKey();
    const cards = Array.isArray(safeWeek[dayKey]) ? safeWeek[dayKey] : [];
    if (cards.length === 0) return { pendentes: [] };
    const tomorrow = tomorrowISO();
    const disciplinasAmanha = Array.from(new Set(cards.map((c) => DISCIPLINA_BY_V[c.v] || c.tag).filter(Boolean)));
    const primeiraDisciplina = disciplinasAmanha[0] || "aula";
    const pcdStudents = safeDash.filter((s) => s && s.pcd && s.pcd !== "nao" && s.pcd !== "nao_informado");
    const pendentes = pcdStudents
      .filter((s) => {
        const sid = studentId(s);
        if ((safeAdapt[sid] || []).includes(`${tomorrow}-any`)) return false;
        const planos = Array.isArray(safePlans[sid]) ? safePlans[sid] : [];
        // Já existe atividade adaptada para amanhã (por data) ou para a disciplina de amanhã.
        const jaTem = planos.some((p) => p && (
          p.data === tomorrow ||
          (p.disciplina && disciplinasAmanha.some((d) => d.toLowerCase() === String(p.disciplina).toLowerCase()))
        ));
        return !jaTem;
      })
      .map((s) => ({
        id: studentId(s),
        nome: s.name,
        necessidade: necessidadeLabel(s.pcd),
        disciplina: primeiraDisciplina,
        turma: s.classRef || "Sem turma",
      }));
    return { pendentes };
  }, [hydrated, dashStudents, week, adaptDone, incPlans]);

  if (!hydrated) return null;

  if (result.pendentes.length === 0) {
    if (!showEmptyFallback) return null;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="sofia-adapt-empty" role="status">
          ✨ Nenhuma adaptação pendente pra hoje.
        </div>
      </>
    );
  }

  const principal = result.pendentes[0];
  const outros = result.pendentes.slice(1);
  const tempoEstimado = "2 minutos";

  const goAdaptar = () => {
    navigate({ to: "/inclusao", search: { view: "detail", aluno: principal.id, tab: "plan" } });
  };

  const openListaSofia = () => {
    const lista = result.pendentes
      .map((p, i) => `${i + 1}. ${p.nome} (${p.necessidade}) — ${p.turma}`)
      .join("\n");
    sofia.openSofia({
      prompt: `Tenho ${result.pendentes.length} alunos PCD com aula de ${principal.disciplina} amanhã sem atividade adaptada. Pode me ajudar a priorizar e gerar todas em sequência?`,
      context: `Adaptações pendentes para amanhã:\n${lista}`,
      send: false,
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="sofia-adapt" role="region" aria-label="Adaptações sugeridas pela Sofia para amanhã">
        <div className="sa-head">
          <div className="sa-av"><Sparkles size={16} /></div>
          <div className="sa-title">✨ Adaptação sugerida · amanhã</div>
        </div>
        <div className="sa-body">
          <b>{principal.nome}</b> ({principal.necessidade}) tem aula de{" "}
          <em>{principal.disciplina}</em> amanhã e ainda não há atividade adaptada.
        </div>
        <div className="sa-meta">
          ~<b>{tempoEstimado}</b> para gerar · turma <b>{principal.turma}</b>
        </div>
        <div className="sa-foot">
          <button className="sa-action" onClick={goAdaptar} type="button">
            Adaptar agora <ArrowRight size={14} />
          </button>
          {outros.length > 0 && (
            <button
              className="sa-stack"
              type="button"
              onClick={openListaSofia}
              aria-label={`Ver ${outros.length} outras sugestões pendentes da Sofia`}
              title="Ver lista completa com a Sofia"
            >
              {outros.slice(0, 3).map((o) => (
                <span key={o.id} className="sa-stack-av" aria-hidden>{initialsOf(o.nome)}</span>
              ))}
              {outros.length > 3 && (
                <span className="sa-stack-av more" aria-hidden>+{outros.length - 3}</span>
              )}
              <span className="sa-stack-text">+{outros.length} pendente{outros.length > 1 ? "s" : ""}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default SofiaAdaptacaoCard;
