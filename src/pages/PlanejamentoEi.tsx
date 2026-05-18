import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Save, Loader2, FileText, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { consumirCreditos } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";

type Student = { id: string; name: string; turma?: string; diag?: string };

const FAIXAS = [
  "Bebês (0 a 1a6m)",
  "Bem pequenos (1a7m a 3a11m)",
  "Pequenos (4 anos)",
  "Maiores (5 anos)",
];

const CAMPOS = [
  { id: "eu_outro_nos", emoji: "🗣️", nome: "O eu, o outro e o nós" },
  { id: "corpo_gestos", emoji: "🎭", nome: "Corpo, gestos e movimentos" },
  { id: "tracos_sons", emoji: "🎨", nome: "Traços, sons, cores e formas" },
  { id: "escuta_fala", emoji: "📖", nome: "Escuta, fala, pensamento e imaginação" },
  { id: "espacos_tempos", emoji: "🔍", nome: "Espaços, tempos, quantidades, relações e transformações" },
];

const TIPOS = [
  "Exploração livre",
  "Brincadeira de faz-de-conta",
  "Leitura e contação",
  "Expressão artística",
  "Movimento e corpo",
  "Descoberta e investigação",
];

const DURACOES = [15, 30, 45, 60];

type Roteiro = {
  titulo: string;
  intencao_pedagogica: { descricao: string; direitos_aprendizagem: string[] };
  preparacao_ambiente: { organizacao: string; materiais: string[]; cuidados_seguranca: string };
  acolhida: { tempo: string; como_iniciar: string };
  desenvolvimento: { o_que_oferecer: string; como_explorar: string; papel_professora: string };
  encerramento: string;
  observacao_registro: { o_que_observar: string; como_registrar: string; indicadores_desenvolvimento: string[] };
  adaptacoes_pcd: string;
};

type RoteiroRow = {
  id: string; turma: string | null; faixa_etaria: string | null;
  campos_experiencia: string[]; tema: string | null; tipo_experiencia: string | null;
  duracao: number | null; conteudo: Roteiro; status: string; gerado_em: string;
};

const empty: Roteiro = {
  titulo: "",
  intencao_pedagogica: { descricao: "", direitos_aprendizagem: [] },
  preparacao_ambiente: { organizacao: "", materiais: [], cuidados_seguranca: "" },
  acolhida: { tempo: "", como_iniciar: "" },
  desenvolvimento: { o_que_oferecer: "", como_explorar: "", papel_professora: "" },
  encerramento: "",
  observacao_registro: { o_que_observar: "", como_registrar: "", indicadores_desenvolvimento: [] },
  adaptacoes_pcd: "",
};

export function PlanejamentoEi() {
  const navigate = useNavigate();
  const [students] = usePersistentState<Student[]>("inc_students", []);

  const [turma, setTurma] = useState("");
  const [faixa, setFaixa] = useState(FAIXAS[2]);
  const [campos, setCampos] = useState<string[]>([CAMPOS[0].id]);
  const [tema, setTema] = useState("");
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [duracao, setDuracao] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roteiro, setRoteiro] = useState<Roteiro | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [list, setList] = useState<RoteiroRow[]>([]);
  const [loading, setLoading] = useState(false);

  const pcdsTurma = useMemo(() => {
    if (!turma) return [] as string[];
    return students.filter((s) => s.turma === turma && s.diag).map((s) => `${s.name} (${s.diag})`);
  }, [students, turma]);

  const loadList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("roteiros_ei")
      .select("id,turma,faixa_etaria,campos_experiencia,tema,tipo_experiencia,duracao,conteudo,status,gerado_em")
      .order("gerado_em", { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) { toast.error("Falha ao carregar roteiros"); return; }
    setList((data || []) as unknown as RoteiroRow[]);
  };
  useEffect(() => { loadList(); }, []);

  const toggleCampo = (id: string) => {
    setCampos((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const gerar = async () => {
    if (campos.length === 0) { toast.error("Selecione ao menos um Campo de Experiência"); return; }
    setGenerating(true);
    try {
      const camposNomes = campos.map((id) => CAMPOS.find((c) => c.id === id)?.nome || id);
      const { data, error } = await supabase.functions.invoke("gerar-roteiro-ei", {
        body: {
          turma, faixa_etaria: faixa,
          campos_experiencia: camposNomes,
          tema, tipo_experiencia: tipo, duracao,
          alunos_pcd: pcdsTurma,
        },
      });
      if (error) throw error;
      const r = (data as { roteiro?: Roteiro })?.roteiro;
      if (!r || !r.titulo) throw new Error("Resposta inválida da Sofia");
      setRoteiro({
        titulo: r.titulo || "",
        intencao_pedagogica: { ...empty.intencao_pedagogica, ...r.intencao_pedagogica },
        preparacao_ambiente: { ...empty.preparacao_ambiente, ...r.preparacao_ambiente },
        acolhida: { ...empty.acolhida, ...r.acolhida },
        desenvolvimento: { ...empty.desenvolvimento, ...r.desenvolvimento },
        encerramento: r.encerramento || "",
        observacao_registro: { ...empty.observacao_registro, ...r.observacao_registro },
        adaptacoes_pcd: r.adaptacoes_pcd || "",
      });
      setCurrentId(null);
      toast.success("Roteiro gerado pela Sofia");
      void consumirCreditos(CUSTOS.planejamento_semanal, "Roteiro EI (Sofia)");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar roteiro");
    } finally {
      setGenerating(false);
    }
  };

  const salvar = async () => {
    if (!roteiro) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Faça login para salvar"); setSaving(false); return; }
    const camposNomes = campos.map((id) => CAMPOS.find((c) => c.id === id)?.nome || id);
    const payload = {
      user_id: u.user.id,
      turma: turma || null,
      faixa_etaria: faixa,
      campos_experiencia: camposNomes,
      tema: tema || null,
      tipo_experiencia: tipo,
      duracao,
      conteudo: JSON.parse(JSON.stringify(roteiro)),
      status: "salvo",
      modelo: "claude-haiku-4-5-20251001",
    };
    const { data, error } = currentId
      ? await supabase.from("roteiros_ei").update(payload).eq("id", currentId).select("id").single()
      : await supabase.from("roteiros_ei").insert([payload]).select("id").single();
    setSaving(false);
    if (error) { toast.error("Falha ao salvar: " + error.message); return; }
    if (data?.id) setCurrentId(data.id);
    toast.success("Roteiro salvo");
    void import("@/lib/admin/track").then(({ trackEvent }) => trackEvent(currentId ? "roteiro_ei_atualizado" : "roteiro_ei_gerado", { turma, faixa_etaria: faixa, tema, tipo_experiencia: tipo, duracao }));
    loadList();
  };

  const abrir = (row: RoteiroRow) => {
    setTurma(row.turma || "");
    setFaixa(row.faixa_etaria || FAIXAS[2]);
    setCampos(
      (row.campos_experiencia || []).map((nome) => CAMPOS.find((c) => c.nome === nome)?.id).filter(Boolean) as string[]
    );
    setTema(row.tema || "");
    setTipo(row.tipo_experiencia || TIPOS[0]);
    setDuracao(row.duracao || 30);
    setRoteiro({ ...empty, ...row.conteudo });
    setCurrentId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const apagar = async (id: string) => {
    if (!confirm("Apagar este roteiro?")) return;
    const { error } = await supabase.from("roteiros_ei").delete().eq("id", id);
    if (error) { toast.error("Falha ao apagar"); return; }
    if (currentId === id) { setRoteiro(null); setCurrentId(null); }
    toast.success("Roteiro apagado");
    loadList();
  };

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="sticky top-0 z-10 border-b bg-card px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/planejamento" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Planejamento
        </button>
        <span className="text-sm font-semibold">Roteiro de Experiência · Educação Infantil</span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Claude Haiku
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center text-lg">🌱</div>
            <div>
              <h1 className="text-xl font-bold">Roteiro de Experiência</h1>
              <p className="text-sm text-muted-foreground">Para Creche e Pré-escola — sem habilidades BNCC do Fundamental, com Campos de Experiência e direitos de aprendizagem.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block font-semibold mb-1">Turma (opcional)</span>
              <input value={turma} onChange={(e) => setTurma(e.target.value)} placeholder="Ex.: Maternal II A" className="w-full border rounded-lg px-3 py-2 bg-background" />
            </label>
            <label className="text-sm">
              <span className="block font-semibold mb-1">Faixa etária</span>
              <select value={faixa} onChange={(e) => setFaixa(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-background">
                {FAIXAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>

            <div className="md:col-span-2">
              <span className="block text-sm font-semibold mb-2">Campos de Experiência (múltipla seleção)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CAMPOS.map((c) => {
                  const active = campos.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCampo(c.id)}
                      className={`text-left border rounded-lg px-3 py-2 flex items-center gap-2 transition ${active ? "bg-emerald-50 border-emerald-300" : "bg-background hover:bg-accent"}`}
                    >
                      <span className="text-lg">{c.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{c.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="text-sm">
              <span className="block font-semibold mb-1">Tema / contexto</span>
              <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: chuva, animais, família, cores" className="w-full border rounded-lg px-3 py-2 bg-background" />
            </label>
            <label className="text-sm">
              <span className="block font-semibold mb-1">Tipo de experiência</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-background">
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="block font-semibold mb-1">Duração</span>
              <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 bg-background">
                {DURACOES.map((d) => <option key={d} value={d}>{d} minutos</option>)}
              </select>
            </label>

            {pcdsTurma.length > 0 && (
              <div className="md:col-span-2 text-xs text-muted-foreground">
                <span className="font-semibold">Crianças PCD na turma:</span> {pcdsTurma.join(", ")}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={gerar} disabled={generating || campos.length === 0} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-emerald-700">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Sofia está escrevendo…" : (roteiro ? "Regenerar roteiro" : "Sofia cria o roteiro")}
            </button>
          </div>
        </section>

        {roteiro && (
          <RoteiroPanel
            roteiro={roteiro}
            onChange={setRoteiro}
            onSave={salvar}
            saving={saving}
            currentId={currentId}
          />
        )}

        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><FileText size={16} /> Roteiros salvos</h2>
            <button onClick={loadList} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <RefreshCw size={12} /> Atualizar
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum roteiro salvo ainda.</div>
          ) : (
            <ul className="divide-y">
              {list.map((r) => (
                <li key={r.id} className="py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.conteudo?.titulo || "(sem título)"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.faixa_etaria} {r.turma ? `· ${r.turma}` : ""} · {r.tipo_experiencia} · {r.duracao}min · {new Date(r.gerado_em).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <button onClick={() => abrir(r)} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-accent">Abrir</button>
                  <button onClick={() => apagar(r.id)} className="text-xs p-1.5 rounded-lg border text-rose-600 hover:bg-rose-50" title="Apagar"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-center pt-4">
          <Link to="/planejamento" className="text-xs text-muted-foreground hover:text-foreground">← Voltar ao Planejamento</Link>
        </div>
      </main>
    </div>
  );
}

function RoteiroPanel(props: {
  roteiro: Roteiro;
  onChange: (r: Roteiro) => void;
  onSave: () => void;
  saving: boolean;
  currentId: string | null;
}) {
  const { roteiro, onChange, onSave, saving, currentId } = props;
  const update = (patch: Partial<Roteiro>) => onChange({ ...roteiro, ...patch });

  return (
    <section className="bg-card border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <input
            value={roteiro.titulo}
            onChange={(e) => update({ titulo: e.target.value })}
            className="text-base font-bold bg-transparent border-b border-dashed border-transparent hover:border-border focus:border-emerald-400 outline-none w-full"
          />
          <div className="text-xs text-muted-foreground mt-1">{currentId ? "Salvo" : "Não salvo"}</div>
        </div>
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-emerald-700 text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar roteiro
        </button>
      </div>

      <Section title="1. Intenção pedagógica" icon="🎯">
        <Field label="Descrição">
          <textarea value={roteiro.intencao_pedagogica.descricao} onChange={(e) => update({ intencao_pedagogica: { ...roteiro.intencao_pedagogica, descricao: e.target.value } })} rows={3} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <ListField label="Direitos de aprendizagem contemplados" items={roteiro.intencao_pedagogica.direitos_aprendizagem} onChange={(v) => update({ intencao_pedagogica: { ...roteiro.intencao_pedagogica, direitos_aprendizagem: v } })} />
      </Section>

      <Section title="2. Preparação do ambiente" icon="🧺">
        <Field label="Organização do espaço">
          <textarea value={roteiro.preparacao_ambiente.organizacao} onChange={(e) => update({ preparacao_ambiente: { ...roteiro.preparacao_ambiente, organizacao: e.target.value } })} rows={2} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <ListField label="Materiais necessários" items={roteiro.preparacao_ambiente.materiais} onChange={(v) => update({ preparacao_ambiente: { ...roteiro.preparacao_ambiente, materiais: v } })} />
        <Field label="Cuidados de segurança">
          <input value={roteiro.preparacao_ambiente.cuidados_seguranca} onChange={(e) => update({ preparacao_ambiente: { ...roteiro.preparacao_ambiente, cuidados_seguranca: e.target.value } })} className="w-full border rounded-lg px-3 py-2 bg-background" />
        </Field>
      </Section>

      <Section title="3. Acolhida" icon="🤗">
        <Field label="Tempo">
          <input value={roteiro.acolhida.tempo} onChange={(e) => update({ acolhida: { ...roteiro.acolhida, tempo: e.target.value } })} className="w-full border rounded-lg px-3 py-2 bg-background" />
        </Field>
        <Field label="Como iniciar">
          <textarea value={roteiro.acolhida.como_iniciar} onChange={(e) => update({ acolhida: { ...roteiro.acolhida, como_iniciar: e.target.value } })} rows={2} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
      </Section>

      <Section title="4. Desenvolvimento da experiência" icon="🎲">
        <Field label="O que a professora oferece/propõe">
          <textarea value={roteiro.desenvolvimento.o_que_oferecer} onChange={(e) => update({ desenvolvimento: { ...roteiro.desenvolvimento, o_que_oferecer: e.target.value } })} rows={3} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <Field label="Como as crianças podem explorar">
          <textarea value={roteiro.desenvolvimento.como_explorar} onChange={(e) => update({ desenvolvimento: { ...roteiro.desenvolvimento, como_explorar: e.target.value } })} rows={3} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <Field label="Papel da professora">
          <textarea value={roteiro.desenvolvimento.papel_professora} onChange={(e) => update({ desenvolvimento: { ...roteiro.desenvolvimento, papel_professora: e.target.value } })} rows={2} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
      </Section>

      <Section title="5. Encerramento" icon="🌅">
        <Field label="Como encerrar respeitando o ritmo das crianças">
          <textarea value={roteiro.encerramento} onChange={(e) => update({ encerramento: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
      </Section>

      <Section title="6. Observação e registro" icon="👁️">
        <Field label="O que observar">
          <textarea value={roteiro.observacao_registro.o_que_observar} onChange={(e) => update({ observacao_registro: { ...roteiro.observacao_registro, o_que_observar: e.target.value } })} rows={2} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <Field label="Como registrar">
          <input value={roteiro.observacao_registro.como_registrar} onChange={(e) => update({ observacao_registro: { ...roteiro.observacao_registro, como_registrar: e.target.value } })} className="w-full border rounded-lg px-3 py-2 bg-background" />
        </Field>
        <ListField label="Indicadores de desenvolvimento" items={roteiro.observacao_registro.indicadores_desenvolvimento} onChange={(v) => update({ observacao_registro: { ...roteiro.observacao_registro, indicadores_desenvolvimento: v } })} />
      </Section>

      {(roteiro.adaptacoes_pcd || "").length > 0 && (
        <Section title="7. Adaptações para crianças PCD" icon="♿">
          <Field label="Ajustes específicos">
            <textarea value={roteiro.adaptacoes_pcd} onChange={(e) => update({ adaptacoes_pcd: e.target.value })} rows={3} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
          </Field>
        </Section>
      )}
    </section>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b last:border-b-0">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <span className="text-base">{icon}</span> {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="text-sm">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      <ul className="space-y-1 mb-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              value={it}
              onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))}
              className="flex-1 border rounded-lg px-3 py-1.5 bg-background text-sm"
            />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-rose-600 p-1.5 rounded-lg border hover:bg-rose-50" title="Remover"><Trash2 size={12} /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onChange([...items, draft.trim()]); setDraft(""); } }}
          placeholder="Adicionar…"
          className="flex-1 border rounded-lg px-3 py-1.5 bg-background text-sm"
        />
        <button type="button" onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }} className="px-3 py-1.5 rounded-lg border text-xs hover:bg-accent">Adicionar</button>
      </div>
    </div>
  );
}