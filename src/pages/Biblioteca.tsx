import { anoDaTurma, linkDoItem } from "@/lib/biblioteca";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PainelNav, painelTokensCss, ICONS } from "@/components/painel/PainelNav";
import { useTurmas } from "@/hooks/useTurmas";
import { usePersistentState } from "@/lib/persist/usePersistentState";

// Minha Biblioteca: o que a professora guarda (planos, atividades, simulados,
// jogos) organizado por ano de escolaridade e disciplina, para o próximo ano
// letivo. Mostra só os anos e disciplinas marcados em "Meus anos e
// disciplinas" (salvo em app_snapshots, chave 'biblioteca_filtros'). Se ela
// ainda não marcou, o ponto de partida vem das turmas (Minha sala) e das
// disciplinas do perfil.
//
// Os botões "Guardar na Biblioteca" ficam nas outras telas (Planejamento,
// Atividade, Questões, Jogos, Cadernos) e gravam em public.biblioteca_itens.

type Item = {
  id: string;
  tipo: string;
  ref_id: string | null;
  titulo: string;
  ano_escolar: number | null;
  componente: string | null;
  ano_letivo: number | null;
  habilidades: string[];
  criado_em: string;
};

type Filtros = { definido: boolean; anos: number[]; disciplinas: string[] };

const ANOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const DISCIPLINAS = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Arte",
  "Educação Física",
  "Língua Inglesa",
  "Ensino Religioso",
];

const TIPO_COR: Record<string, string> = {
  plano: "var(--pn-green-soft)",
  atividade: "var(--pn-cream)",
  ficha: "var(--pn-cream)",
  simulado: "var(--pn-pink)",
  jogo: "var(--pn-lilac)",
  sequencia: "var(--pn-blue-soft)",
};
const TIPO_NOME: Record<string, string> = {
  plano: "Plano de aula",
  atividade: "Atividade",
  ficha: "Ficha",
  simulado: "Simulado",
  jogo: "Jogo",
  sequencia: "Sequência didática",
};

export function nomeAno(n: number | null): string {
  if (n === null || n === undefined) return "Sem ano";
  return n === 0 ? "Educação Infantil" : `${n}º ano`;
}

export { anoDaTurma };

const css = `
.bb{min-height:100dvh;padding-bottom:40px;}
.bb-wrap{max-width:1180px;margin:0 auto;padding:22px 24px 0;}
.bb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.bb-eyebrow{font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--pn-green);}
.bb-title{margin:6px 0 4px;font-family:var(--pn-display);font-weight:800;font-size:32px;letter-spacing:-.045em;line-height:1.05;}
.bb-sub{margin:0;color:var(--pn-muted);font-size:15px;line-height:1.5;max-width:62ch;}
.bb-yr{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--pn-surface);border:1.5px solid var(--pn-line);}
.bb-yr button{height:34px;padding:0 12px;border-radius:9px;border:0;background:none;font-family:inherit;font-weight:700;font-size:14px;color:var(--pn-muted);cursor:pointer;}
.bb-yr button[aria-pressed="true"]{background:var(--pn-ink);color:#fff;}
.bb-perfil{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:16px 0;padding:10px 14px;border-radius:14px;background:var(--pn-blue-soft);border:1.5px solid var(--pn-ink);font-size:14.5px;line-height:1.4;}
.bb-perfil .sp{flex:1;}
.bb-perfil .pn-btn{height:36px;font-size:14px;}
.bb-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:16px;align-items:start;}
.bb-anos{display:flex;flex-direction:column;gap:6px;}
.bb-anos button{display:flex;align-items:center;justify-content:space-between;gap:8px;height:42px;padding:0 12px;border-radius:11px;border:1.5px solid var(--pn-line);background:var(--pn-surface);
  font-family:inherit;font-weight:700;font-size:14.5px;color:var(--pn-ink);cursor:pointer;text-align:left;}
.bb-anos button span{font-size:12.5px;color:var(--pn-muted);font-variant-numeric:tabular-nums;}
.bb-anos button[aria-pressed="true"]{background:var(--pn-ink);border-color:var(--pn-ink);color:#fff;}
.bb-anos button[aria-pressed="true"] span{color:#fff;}
.bb-filt{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
.bb-filt button{height:34px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-ink);cursor:pointer;}
.bb-filt button[aria-pressed="true"]{background:var(--pn-green);border-color:var(--pn-ink);color:#fff;}
.bb-sec{margin-bottom:18px;}
.bb-sec-h{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;}
.bb-sec-h h3{margin:0;font-family:var(--pn-display);font-size:17px;}
.bb-sec-h span{font-size:13px;color:var(--pn-muted);}
.bb-shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
.bb-it{background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:14px;padding:12px;display:grid;gap:6px;align-content:start;}
.bb-ty{justify-self:start;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--pn-bg);}
.bb-it h4{margin:0;font-family:var(--pn-display);font-size:15.5px;line-height:1.3;}
.bb-it small{color:var(--pn-muted);font-size:12.5px;}
.bb-code{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:var(--pn-bg);padding:1px 5px;border-radius:5px;color:var(--pn-ink);}
.bb-rm{justify-self:start;border:0;background:none;padding:0;font-family:inherit;font-size:13px;font-weight:700;color:var(--pn-muted);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
.bb-rm:hover{color:#B42318;}
.bb-acoes{display:flex;align-items:center;gap:12px;margin-top:2px;}
.bb .bb-abrir{height:32px;padding:0 14px;font-size:13.5px;text-decoration:none;}
.bb-empty{background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:4px 4px 0 var(--pn-ink);padding:22px;}
.bb-empty h2{margin:0;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.bb-empty p{margin:8px 0 0;font-size:15px;line-height:1.5;color:var(--pn-muted);}
.bb-empty a{color:var(--pn-green);font-weight:700;}
.bb-msg{padding:16px;border:1.5px dashed var(--pn-line);border-radius:14px;color:var(--pn-muted);font-size:14.5px;text-align:center;}
.bb-bg{position:fixed;inset:0;z-index:80;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.bb-modal{width:100%;max-width:560px;max-height:90vh;overflow:auto;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:6px 6px 0 var(--pn-ink);padding:20px;}
.bb-modal h2{margin:0;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.bb-modal p{margin:6px 0 14px;color:var(--pn-muted);font-size:14px;line-height:1.45;}
.bb-modal b.lbl{display:block;font-family:var(--pn-display);margin:8px 0;}
.bb-ck{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:12px;}
.bb-ck label{display:flex;align-items:center;gap:8px;min-height:40px;padding:6px 10px;border-radius:10px;border:1.5px solid var(--pn-line);font-size:14.5px;font-weight:600;cursor:pointer;}
.bb-ck input{width:18px;height:18px;accent-color:#0B7A55;}
.bb-modal .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;}
@media (max-width:860px){
  .bb{padding-bottom:110px;}
  .bb-wrap{padding:16px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));}
  .bb-title{font-size:27px;}
  .bb-layout{grid-template-columns:1fr;}
  .bb-anos{flex-direction:row;flex-wrap:wrap;}
  .bb-anos button{height:38px;font-size:13.5px;}
  .bb-shelf{grid-template-columns:1fr;}
}
`;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function Biblioteca() {
  const anoAtual = new Date().getFullYear();
  const { turmas } = useTurmas();
  const [filtros, setFiltros] = usePersistentState<Filtros>("biblioteca_filtros", {
    definido: false,
    anos: [],
    disciplinas: [],
  });
  const [discPerfil, setDiscPerfil] = useState<string[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro" | "sem_login">(
    "carregando",
  );
  const [anoLetivo, setAnoLetivo] = useState(anoAtual);
  const [anoSel, setAnoSel] = useState<number | null>(null);
  const [mat, setMat] = useState("Todas");
  const [editar, setEditar] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setEstado("sem_login");
        return;
      }
      const [{ data, error }, perfil] = await Promise.all([
        supabase
          .from("biblioteca_itens")
          .select(
            "id, tipo, ref_id, titulo, ano_escolar, componente, ano_letivo, habilidades, criado_em",
          )
          .eq("user_id", user.id)
          .order("criado_em", { ascending: false })
          .limit(500),
        supabase.from("profiles").select("disciplinas").eq("user_id", user.id).maybeSingle(),
      ]);
      setDiscPerfil((perfil.data?.disciplinas ?? []).filter(Boolean));
      if (error) {
        // Tabela ainda não criada no banco: mostra a biblioteca vazia.
        if (/does not exist|schema cache|relation/i.test(error.message)) {
          setItens([]);
          setEstado("pronto");
          return;
        }
        setEstado("erro");
        return;
      }
      setItens((data ?? []) as Item[]);
      setEstado("pronto");
    } catch {
      setEstado("erro");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Ponto de partida quando ela ainda não marcou nada: anos das turmas e
  // disciplinas do perfil. Sem nenhuma pista, mostra tudo.
  const anosTurmas = useMemo(() => {
    const s = new Set<number>();
    turmas.forEach((t) => {
      const a = anoDaTurma(t.grade || t.name);
      if (a !== null) s.add(a);
    });
    return [...s].sort((a, b) => a - b);
  }, [turmas]);
  const meusAnos = filtros.definido ? filtros.anos : anosTurmas.length ? anosTurmas : ANOS;
  const minhasDisc = filtros.definido
    ? filtros.disciplinas
    : discPerfil.filter((d) => DISCIPLINAS.includes(d)).length
      ? discPerfil.filter((d) => DISCIPLINAS.includes(d))
      : DISCIPLINAS;

  const anosLetivos = useMemo(() => {
    const s = new Set<number>([anoAtual, anoAtual + 1]);
    itens.forEach((i) => i.ano_letivo && s.add(i.ano_letivo));
    return [...s].sort((a, b) => a - b);
  }, [itens, anoAtual]);

  const visiveis = useMemo(
    () =>
      itens.filter((i) => {
        if ((i.ano_letivo ?? anoAtual) !== anoLetivo) return false;
        if (i.ano_escolar !== null && !meusAnos.includes(i.ano_escolar)) return false;
        if (i.ano_escolar === 0 || !i.componente) return true;
        // Componente fora da lista conhecida (ex.: campo de experiência): mostra.
        if (!DISCIPLINAS.includes(i.componente)) return true;
        return minhasDisc.includes(i.componente);
      }),
    [itens, anoLetivo, meusAnos, minhasDisc, anoAtual],
  );

  const contagem = useMemo(() => {
    const c = new Map<number, number>();
    visiveis.forEach((i) => {
      if (i.ano_escolar !== null) c.set(i.ano_escolar, (c.get(i.ano_escolar) ?? 0) + 1);
    });
    return c;
  }, [visiveis]);

  const anoAtivo = anoSel !== null && meusAnos.includes(anoSel) ? anoSel : (meusAnos[0] ?? null);
  const doAno = visiveis.filter((i) => i.ano_escolar === anoAtivo);
  const semAno = visiveis.filter((i) => i.ano_escolar === null);
  const lista = [...doAno, ...semAno];
  const mats = [...new Set(lista.map((i) => i.componente || "Outros"))];
  const matAtiva = mat !== "Todas" && mats.includes(mat) ? mat : "Todas";
  const secoes = (matAtiva === "Todas" ? mats : [matAtiva]).map((m) => ({
    m,
    its: lista.filter((i) => (i.componente || "Outros") === m),
  }));

  const remover = async (id: string) => {
    const { error } = await supabase.from("biblioteca_itens").delete().eq("id", id);
    if (error) {
      toast.error("Não consegui tirar da Biblioteca. Tente de novo.");
      return;
    }
    setItens((xs) => xs.filter((x) => x.id !== id));
    toast.success("Tirado da Minha Biblioteca.");
  };

  const temAlgoNoAno = itens.some((i) => (i.ano_letivo ?? anoAtual) === anoLetivo);

  return (
    <div className="pn bb">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + css }} />
      <PainelNav />
      <main className="bb-wrap">
        <div className="bb-head">
          <div>
            <span className="bb-eyebrow">Minha Biblioteca</span>
            <h1 className="bb-title">Suas atividades, por ano e matéria.</h1>
            <p className="bb-sub">
              Tudo que você guarda fica no ano de escolaridade e na matéria certos. No próximo ano
              letivo, você leva o que quiser.
            </p>
          </div>
          <div className="bb-yr" role="group" aria-label="Ano letivo">
            {anosLetivos.map((y) => (
              <button
                key={y}
                type="button"
                aria-pressed={anoLetivo === y}
                onClick={() => setAnoLetivo(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="bb-perfil">
          <span>
            {filtros.definido ? "Você dá aula para " : "Mostrando "}
            <b>
              {meusAnos.length === ANOS.length ? "todos os anos" : meusAnos.map(nomeAno).join(", ")}
            </b>
            {meusAnos.some((a) => a > 0) && (
              <>
                {" · "}
                <b>
                  {minhasDisc.length === DISCIPLINAS.length
                    ? "todas as disciplinas"
                    : minhasDisc.join(", ")}
                </b>
              </>
            )}
          </span>
          <span className="sp" />
          <button type="button" className="pn-btn" onClick={() => setEditar(true)}>
            {filtros.definido ? "Alterar" : "Meus anos e disciplinas"}
          </button>
        </div>

        {estado === "carregando" && <div className="bb-msg">Carregando…</div>}
        {estado === "erro" && (
          <div className="bb-msg">
            Não consegui carregar a sua Biblioteca agora.{" "}
            <button type="button" className="bb-rm" onClick={() => void carregar()}>
              Tentar de novo
            </button>
          </div>
        )}
        {estado === "sem_login" && (
          <div className="bb-msg">Entre na sua conta para ver a sua Biblioteca.</div>
        )}

        {estado === "pronto" && !temAlgoNoAno && (
          <section className="bb-empty" aria-labelledby="bb-empty-h">
            <h2 id="bb-empty-h">
              {anoLetivo > anoAtual
                ? `Seu ${anoLetivo} ainda está vazio.`
                : "Sua Biblioteca ainda está vazia."}
            </h2>
            <p>Guarde aqui planos, atividades e simulados para o próximo ano letivo.</p>
            <p>
              Use o botão “📚 Guardar na Biblioteca” ao montar uma atividade no{" "}
              <Link to="/planejamento">Planejamento</Link>, no plano do semestre e na lista de
              simulados de <Link to="/questoes">Questões</Link>.
            </p>
          </section>
        )}

        {estado === "pronto" && temAlgoNoAno && (
          <div className="bb-layout">
            <nav className="bb-anos" aria-label="Ano de escolaridade">
              {meusAnos.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={anoAtivo === a}
                  onClick={() => {
                    setAnoSel(a);
                    setMat("Todas");
                  }}
                >
                  {nomeAno(a)}
                  <span>{contagem.get(a) ?? 0}</span>
                </button>
              ))}
            </nav>
            <div style={{ minWidth: 0 }}>
              {lista.length === 0 ? (
                <div className="bb-msg">
                  Nada guardado ainda no {nomeAno(anoAtivo)} em {anoLetivo}.
                </div>
              ) : (
                <>
                  <div className="bb-filt" role="group" aria-label="Matéria">
                    {["Todas", ...mats].map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={matAtiva === m}
                        onClick={() => setMat(m)}
                      >
                        {m}
                        {m === "Todas"
                          ? ""
                          : ` · ${lista.filter((i) => (i.componente || "Outros") === m).length}`}
                      </button>
                    ))}
                  </div>
                  {secoes.map(({ m, its }) => (
                    <section className="bb-sec" key={m}>
                      <div className="bb-sec-h">
                        <h3>{m}</h3>
                        <span>
                          {its.length} {its.length === 1 ? "item" : "itens"}
                        </span>
                      </div>
                      <div className="bb-shelf">
                        {its.map((i) => (
                          <div className="bb-it" key={i.id}>
                            <span
                              className="bb-ty"
                              style={{ background: TIPO_COR[i.tipo] ?? "var(--pn-bg)" }}
                            >
                              {TIPO_NOME[i.tipo] ?? i.tipo}
                            </span>
                            <h4>{i.titulo || "Sem título"}</h4>
                            <small>
                              {i.ano_escolar === null ? "Sem ano" : nomeAno(i.ano_escolar)}
                              {i.habilidades?.length > 0 &&
                                i.habilidades.slice(0, 3).map((h) => (
                                  <span key={h}>
                                    {" "}
                                    <span className="bb-code">{h}</span>
                                  </span>
                                ))}
                            </small>
                            <div className="bb-acoes">
                              <Link
                                className="pn-btn bb-abrir"
                                to={linkDoItem(i.tipo, i.ref_id).to}
                                search={linkDoItem(i.tipo, i.ref_id).search as never}
                              >
                                Abrir
                              </Link>
                              <button
                                type="button"
                                className="bb-rm"
                                onClick={() => void remover(i.id)}
                              >
                                Tirar da Biblioteca
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {editar && (
        <EditarFiltros
          anos={meusAnos}
          disciplinas={minhasDisc}
          onClose={() => setEditar(false)}
          onSalvar={(anos, disciplinas) => {
            setFiltros({ definido: true, anos, disciplinas });
            setAnoSel(anos[0] ?? null);
            setMat("Todas");
            setEditar(false);
            toast.success(`Pronto. A Biblioteca agora mostra ${anos.map(nomeAno).join(", ")}.`);
          }}
        />
      )}
    </div>
  );
}

function EditarFiltros({
  anos,
  disciplinas,
  onClose,
  onSalvar,
}: {
  anos: number[];
  disciplinas: string[];
  onClose: () => void;
  onSalvar: (anos: number[], disciplinas: string[]) => void;
}) {
  const [a, setA] = useState<number[]>(anos);
  const [d, setD] = useState<string[]>(disciplinas);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tog = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  return (
    <div className="bb-bg" onClick={onClose}>
      <div
        className="bb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-ed-h"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bb-ed-h">Meus anos e disciplinas</h2>
        <p>
          A Minha Biblioteca mostra só o que você marcar aqui. Se você dá aula só no 3º ano, só o 3º
          ano aparece.
        </p>
        <b className="lbl">Anos de escolaridade</b>
        <div className="bb-ck">
          {ANOS.map((n) => (
            <label key={n}>
              <input type="checkbox" checked={a.includes(n)} onChange={() => setA(tog(a, n))} />
              {nomeAno(n)}
            </label>
          ))}
        </div>
        <b className="lbl">Disciplinas</b>
        <div className="bb-ck">
          {DISCIPLINAS.map((x) => (
            <label key={x}>
              <input type="checkbox" checked={d.includes(x)} onChange={() => setD(tog(d, x))} />
              {x}
            </label>
          ))}
        </div>
        <p style={{ fontSize: 13, margin: "0 0 12px" }}>
          Na Educação Infantil, a Biblioteca mostra tudo do ano, sem filtro de disciplina.
        </p>
        {erro && (
          <p role="alert" style={{ color: "#B42318", fontWeight: 700, margin: "0 0 10px" }}>
            {erro}
          </p>
        )}
        <div className="acts">
          <button
            type="button"
            className="pn-btn primary"
            onClick={() => {
              if (!a.length) {
                setErro("Marque pelo menos um ano.");
                return;
              }
              onSalvar(
                [...a].sort((x, y) => x - y),
                d.length ? DISCIPLINAS.filter((x) => d.includes(x)) : DISCIPLINAS,
              );
            }}
          >
            <Svg>{ICONS.check}</Svg>
            Salvar
          </button>
          <button type="button" className="pn-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
