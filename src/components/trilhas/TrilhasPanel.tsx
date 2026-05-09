import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Calendar, BookOpen, Trash2 } from "lucide-react";

type Trilha = {
  id: string;
  turma: string | null;
  ano_escolar: string | null;
  disciplina: string | null;
  semestre: string | null;
  tema_central: string | null;
  justificativa: string | null;
  status: string;
  created_at: string;
};

type Semana = {
  id: string;
  semana: number;
  titulo: string | null;
  habilidades_bncc: unknown;
  status: string;
};

export function TrilhasPanel() {
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ turma: "", ano: "", disciplina: "", semestre: "1º semestre", contexto: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    const { data } = await supabase.from("trilhas").select("*").order("created_at", { ascending: false });
    setTrilhas((data as Trilha[]) || []);
  };
  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!selected) { setSemanas([]); return; }
    supabase.from("trilha_semanas").select("*").eq("trilha_id", selected).order("semana")
      .then(({ data }) => setSemanas((data as Semana[]) || []));
  }, [selected]);

  const gerarTrilha = async () => {
    if (!form.turma || !form.ano || !form.disciplina) {
      setError("Preencha turma, ano e disciplina.");
      return;
    }
    setError(null); setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) throw new Error("Faça login novamente.");
      const { data, error: fnErr } = await supabase.functions.invoke("gerar-trilha", { body: form });
      if (fnErr) throw fnErr;
      const t = (data as { trilha?: Record<string, unknown> })?.trilha || {};
      const tema = (t.tema_central as { titulo?: string; justificativa?: string }) || {};
      const semanasArr = ((t.semanas as unknown[]) || []) as Array<{ semana: number; titulo: string; habilidades_foco?: string[]; tipo_atividade?: string; conecta_anterior?: string; prepara_proxima?: string }>;

      const { data: trilhaRow, error: insErr } = await supabase.from("trilhas").insert([{
        user_id: userId,
        client_id: `tr_${Date.now()}`,
        turma: form.turma,
        ano_escolar: form.ano,
        disciplina: form.disciplina,
        semestre: form.semestre,
        ano_letivo: new Date().getFullYear(),
        tema_central: tema.titulo || "Trilha sem título",
        justificativa: tema.justificativa || "",
        contexto_adicional: form.contexto,
        status: "ativa",
        data: t,
      }]).select().single();
      if (insErr) throw insErr;

      if (semanasArr.length > 0) {
        const rows = semanasArr.slice(0, 20).map((s) => ({
          user_id: userId,
          trilha_id: trilhaRow!.id,
          semana: s.semana,
          titulo: s.titulo || `Semana ${s.semana}`,
          habilidades_bncc: s.habilidades_foco || [],
          tipo_atividade: s.tipo_atividade || "",
          conecta_anterior: s.conecta_anterior || "",
          prepara_proxima: s.prepara_proxima || "",
          status: s.semana === 1 ? "em_andamento" : "futura",
        }));
        await supabase.from("trilha_semanas").insert(rows);
      }
      await carregar();
      setSelected(trilhaRow!.id);
      setForm({ turma: "", ano: "", disciplina: "", semestre: "1º semestre", contexto: "" });
    } catch (e) {
      setError((e as Error).message || "Não consegui gerar a trilha agora. Tente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Apagar esta trilha?")) return;
    await supabase.from("trilhas").delete().eq("id", id);
    if (selected === id) setSelected(null);
    carregar();
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Nova trilha semestral <small style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12.5, marginLeft: 6 }}>· Sofia distribui ~20 semanas com BNCC</small></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 14 }}>
          <input placeholder="Turma (ex: 2º A)" value={form.turma} onChange={(e) => setForm({ ...form, turma: e.target.value })} style={inputStyle} />
          <input placeholder="Ano escolar (ex: 2º ano EF)" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} style={inputStyle} />
          <input placeholder="Disciplina" value={form.disciplina} onChange={(e) => setForm({ ...form, disciplina: e.target.value })} style={inputStyle} />
          <select value={form.semestre} onChange={(e) => setForm({ ...form, semestre: e.target.value })} style={inputStyle}>
            <option>1º semestre</option><option>2º semestre</option>
          </select>
        </div>
        <textarea placeholder="Contexto adicional (opcional): projetos da escola, datas comemorativas..." value={form.contexto} onChange={(e) => setForm({ ...form, contexto: e.target.value })} style={{ ...inputStyle, marginTop: 10, minHeight: 60, width: "100%", resize: "vertical" }} />
        {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#FEF2F2", color: "#991B1B", fontSize: 13 }}>{error}</div>}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button className="pl-btn primary" onClick={gerarTrilha} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "Sofia está montando a trilha…" : "Sofia sugere a trilha"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Suas trilhas</h2>
        {trilhas.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhuma trilha ainda. Crie a primeira acima.</p>}
        <div style={{ display: "grid", gap: 10 }}>
          {trilhas.map((t) => (
            <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 14, cursor: "pointer", background: selected === t.id ? "#FFF7ED" : "#fff" }} onClick={() => setSelected(selected === t.id ? null : t.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}><BookOpen size={14} style={{ display: "inline", marginRight: 6 }} />{t.tema_central}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>{t.turma} · {t.ano_escolar} · {t.disciplina} · {t.semestre}</div>
                </div>
                <button className="pl-btn ghost" onClick={(e) => { e.stopPropagation(); excluir(t.id); }} title="Excluir trilha"><Trash2 size={14} /></button>
              </div>
              {selected === t.id && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  {t.justificativa && <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>{t.justificativa}</p>}
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}><Calendar size={14} style={{ display: "inline", marginRight: 6 }} />20 semanas</h3>
                  <div style={{ display: "grid", gap: 6 }}>
                    {semanas.map((s) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 10px", background: "#F8FAFC", borderRadius: 6 }}>
                        <span style={{ minWidth: 28, fontWeight: 600, color: "var(--orange)" }}>S{s.semana}</span>
                        <span style={{ flex: 1 }}>{s.titulo}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: s.status === "concluida" ? "#D1FAE5" : s.status === "em_andamento" ? "#DBEAFE" : "#F1F5F9", color: s.status === "concluida" ? "#065F46" : s.status === "em_andamento" ? "#1E40AF" : "#64748B" }}>{s.status}</span>
                      </div>
                    ))}
                    {semanas.length === 0 && <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Nenhuma semana gerada ainda.</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 13,
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--ink)",
};