import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import {
  DESTINOS,
  WhatsappLogo,
  avisarMudancaWhatsapp,
  destinoLabel,
  type DestinoId,
} from "@/components/painel/whatsapp";
import {
  nomeDaPergunta,
  resolverAluno,
  type AlunoSala,
} from "@/lib/whatsapp/alunoDaMensagem";

// "Para confirmar": mensagens que chegaram pelo WhatsApp (texto ou áudio
// transcrito) e esperam a professora conferir o aluno, o texto e o destino.
//
// IMPORTANTE (honesto): por enquanto "Confirmar" só grava status, texto e
// destino_final na própria tabela whatsapp_entradas. A gravação no destino
// real (registro do aluno, parecer, diário, PEI, agenda…) fica para quando os
// registros saírem dos blocos JSON (app_snapshots) para tabelas próprias.
// Até lá, nada é copiado para a ficha do aluno, e a tela diz isso.

type Entrada = {
  id: string;
  recebido_em: string;
  tipo: string;
  texto: string;
  aluno_id: string | null;
  aluno_nome: string | null;
  destino_sugerido: string | null;
  payload?: unknown;
};

type Estado = "carregando" | "pronto" | "sem_login" | "erro";

const css = `
.cf{min-height:100dvh;padding-bottom:40px;}
.cf-wrap{max-width:960px;margin:0 auto;padding:22px 24px 0;}
.cf-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--pn-green);}
.cf-eyebrow svg{color:#0B7A55;}
.cf-title{margin:6px 0 4px;font-family:var(--pn-display);font-weight:800;font-size:32px;letter-spacing:-.045em;line-height:1.05;}
.cf-sub{margin:0 0 18px;color:var(--pn-muted);font-size:15px;line-height:1.5;max-width:62ch;}
.cf-note{margin:0 0 16px;padding:10px 14px;border-radius:12px;background:var(--pn-cream);border:1.5px solid var(--pn-ink);font-size:14px;line-height:1.45;}
.cf-list{display:flex;flex-direction:column;gap:14px;}
.cf-item{background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:18px;box-shadow:4px 4px 0 var(--pn-ink);padding:16px;display:grid;gap:12px;}
.cf-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.cf-ava{width:40px;height:40px;border-radius:12px;background:var(--pn-sun);border:2px solid var(--pn-ink);display:flex;align-items:center;justify-content:center;font-family:var(--pn-display);font-weight:800;font-size:15px;flex:none;}
.cf-ava.sem{background:var(--pn-pink);}
.cf-who{min-width:0;flex:1;}
.cf-who b{display:block;font-family:var(--pn-display);font-size:17px;}
.cf-who span{display:block;color:var(--pn-muted);font-size:13px;}
.cf-tag{padding:4px 8px;border-radius:6px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--pn-bg);}
.cf-txt{margin:0;font-size:16px;line-height:1.5;white-space:pre-wrap;}
.cf-edit{width:100%;min-height:84px;border:2px solid var(--pn-ink);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:16px;line-height:1.45;color:var(--pn-ink);resize:vertical;background:#fff;}
.cf-dh{font-size:13px;font-weight:700;color:var(--pn-muted);margin-bottom:6px;}
.cf-dests{display:flex;flex-wrap:wrap;gap:6px;}
.cf-dests button{height:36px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-size:14px;font-weight:700;color:var(--pn-ink);cursor:pointer;}
.cf-dests button[aria-pressed="true"]{background:var(--pn-green);border-color:var(--pn-ink);color:#fff;}
.cf-dests button .sug{font-weight:600;font-size:12px;opacity:.8;margin-left:4px;}
.cf-act{display:flex;gap:10px;flex-wrap:wrap;}
.cf-link{border:0;background:none;padding:0 4px;font-family:inherit;font-size:14px;font-weight:700;color:var(--pn-green);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
.cf-empty{background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:4px 4px 0 var(--pn-ink);padding:22px;}
.cf-empty-h{display:flex;align-items:center;gap:12px;}
.cf-empty-h .ic{width:52px;height:52px;border-radius:14px;background:#D9FDD3;border:2px solid var(--pn-ink);display:flex;align-items:center;justify-content:center;color:#0B7A55;flex:none;}
.cf-empty h2{margin:0;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.cf-empty p{margin:10px 0 0;font-size:15px;line-height:1.5;}
.cf-how{margin:18px 0 0;font-family:var(--pn-display);font-size:16px;}
.cf-steps{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px;}
.cf-steps li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.45;}
.cf-steps li b.k{width:26px;height:26px;border-radius:8px;background:var(--pn-ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex:none;}
.cf-soon{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:8px;background:var(--pn-cream);font-size:13px;font-weight:700;}
.cf-qual{padding:12px 14px;border-radius:12px;background:var(--pn-cream);border:1.5px solid var(--pn-ink);}
.cf-qual b{display:block;font-family:var(--pn-display);font-size:16px;margin-bottom:8px;}
.cf-qual .op{display:flex;flex-wrap:wrap;gap:8px;}
.cf-qual .op button{min-height:40px;padding:6px 12px;border-radius:10px;border:1.5px solid var(--pn-ink);background:#fff;font-family:inherit;font-size:15px;font-weight:700;color:var(--pn-ink);cursor:pointer;text-align:left;}
.cf-qual .op button span{display:block;font-size:12.5px;font-weight:600;color:var(--pn-muted);}
.cf-sel{width:100%;max-width:420px;height:42px;border:2px solid var(--pn-ink);border-radius:10px;padding:0 10px;font-family:inherit;font-size:16px;background:#fff;color:var(--pn-ink);}
.cf-msg{padding:16px;border:1.5px dashed var(--pn-line);border-radius:14px;color:var(--pn-muted);font-size:14.5px;text-align:center;}
@media (max-width:860px){
  .cf{padding-bottom:110px;}
  .cf-wrap{padding:16px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));}
  .cf-title{font-size:27px;}
  .cf-item{padding:14px;}
  .cf-act .pn-btn{flex:1;}
}
`;

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return (
    ((p[0]?.[0] ?? "") + (p.length > 1 ? (p[p.length - 1][0] ?? "") : "")).toUpperCase() || "?"
  );
}

function quando(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ehDestino(v: string | null): v is DestinoId {
  return !!v && DESTINOS.some((d) => d.id === v);
}

export function Confirmar() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [itens, setItens] = useState<Entrada[]>([]);
  const [alunos, setAlunos] = useState<AlunoSala[]>([]);

  const carregar = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setEstado("sem_login");
        return;
      }
      const [{ data, error }, { data: sala }] = await Promise.all([
        supabase
          .from("whatsapp_entradas")
          .select("id, recebido_em, tipo, texto, aluno_id, aluno_nome, destino_sugerido, payload")
          .eq("user_id", user.id)
          .eq("status", "pendente")
          .order("recebido_em", { ascending: false })
          .limit(100),
        // Alunos da Minha sala, para saber quem é quem quando o nome se repete.
        supabase.from("alunos_inclusao").select("id, nome, turma").eq("user_id", user.id).limit(2000),
      ]);
      setAlunos(
        (sala ?? [])
          .map((a) => ({
            id: String(a.id),
            nome: (a.nome ?? "").trim(),
            turma: (a.turma ?? "").trim(),
          }))
          .filter((a) => a.nome)
          .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")),
      );
      if (error) {
        // Tabela ainda não criada no banco: mesmo estado vazio, sem erro técnico.
        if (/does not exist|schema cache|relation/i.test(error.message)) {
          setItens([]);
          setEstado("pronto");
          return;
        }
        setEstado("erro");
        return;
      }
      setItens((data ?? []) as Entrada[]);
      setEstado("pronto");
    } catch {
      setEstado("erro");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tirar = (id: string) => {
    setItens((xs) => xs.filter((x) => x.id !== id));
    avisarMudancaWhatsapp();
  };

  return (
    <div className="pn cf">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + css }} />
      <PainelNav />
      <main className="cf-wrap">
        <span className="cf-eyebrow">
          <WhatsappLogo size={16} />
          Do seu celular
        </span>
        <h1 className="cf-title">Para confirmar</h1>
        <p className="cf-sub">
          Confira o aluno, ajuste o texto se quiser e escolha para onde vai. Nada vai para o aluno
          antes de você confirmar.
        </p>

        {estado === "carregando" && <div className="cf-msg">Carregando…</div>}
        {estado === "erro" && (
          <div className="cf-msg">
            Não consegui carregar as mensagens agora.{" "}
            <button type="button" className="cf-link" onClick={() => void carregar()}>
              Tentar de novo
            </button>
          </div>
        )}
        {estado === "sem_login" && (
          <div className="cf-msg">Entre na sua conta para ver as mensagens do celular.</div>
        )}
        {estado === "pronto" && itens.length === 0 && <Vazio />}
        {estado === "pronto" && itens.length > 0 && (
          <>
            <p className="cf-note">
              Ao confirmar, a mensagem fica guardada com o destino escolhido. As de “Leitura e
              escrita” já aparecem na ficha do aluno em Criança alfabetizada. Para os outros
              destinos, a cópia automática chega numa próxima versão.
            </p>
            <div className="cf-list">
              {itens.map((x) => (
                <Item key={x.id} x={x} alunos={alunos} onFeito={tirar} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Vazio() {
  return (
    <section className="cf-empty" aria-labelledby="cf-empty-h">
      <div className="cf-empty-h">
        <span className="ic">
          <WhatsappLogo size={30} />
        </span>
        <div>
          <h2 id="cf-empty-h">Nada para confirmar</h2>
          <span className="cf-soon">Registro pelo WhatsApp: em breve</span>
        </div>
      </div>
      <p>
        Em breve você manda pelo WhatsApp, em texto ou áudio: “Heitor reconheceu as vogais”. A
        mensagem chega aqui para você conferir antes de ir para o aluno.
      </p>
      <h3 className="cf-how">Como vai funcionar</h3>
      <ol className="cf-steps">
        <li>
          <b className="k">1</b>
          <span>Você conecta o seu número uma vez, em Configurações.</span>
        </li>
        <li>
          <b className="k">2</b>
          <span>Escreve ou grava um áudio, do jeito que falaria com uma colega.</span>
        </li>
        <li>
          <b className="k">3</b>
          <span>
            O AgilizaProf separa por aluno e sugere o destino: registro, leitura e escrita,
            relatório e parecer, planejamento, diário de bordo, atividade PCD, inclusão e PEI ou
            agenda.
          </span>
        </li>
        <li>
          <b className="k">4</b>
          <span>Você confere aqui. Só depois de confirmar vai para o lugar certo.</span>
        </li>
      </ol>
    </section>
  );
}

function Item({
  x,
  alunos,
  onFeito,
}: {
  x: Entrada;
  alunos: AlunoSala[];
  onFeito: (id: string) => void;
}) {
  const [texto, setTexto] = useState(x.texto);
  const [editando, setEditando] = useState(false);
  const [destino, setDestino] = useState<DestinoId | null>(
    ehDestino(x.destino_sugerido) ? x.destino_sugerido : null,
  );
  const [ocupado, setOcupado] = useState(false);
  const nomeMsg = (x.aluno_nome || "").trim();
  const resolvido = useMemo(() => resolverAluno(x, alunos), [x, alunos]);
  // undefined = a professora ainda não mexeu; segue o que veio resolvido.
  const [alunoEscolhido, setAlunoEscolhido] = useState<string | null | undefined>(undefined);
  const [trocando, setTrocando] = useState(false);
  const alunoId = alunoEscolhido === undefined ? (resolvido.escolhido?.id ?? null) : alunoEscolhido;
  const aluno = alunoId ? (alunos.find((a) => a.id === alunoId) ?? null) : null;
  // Nome repetido (dois Bentos) e ninguém escolhido ainda: pergunta antes de confirmar.
  const emDuvida = !aluno && alunoEscolhido === undefined && resolvido.candidatos.length > 1;
  const foraDaSala =
    !aluno && alunoEscolhido === undefined && !!nomeMsg && alunos.length > 0 && resolvido.candidatos.length === 0;
  const nome = aluno?.nome || nomeMsg;
  const escolher = (id: string | null) => {
    setAlunoEscolhido(id);
    setTrocando(false);
  };

  const salvar = async (status: "confirmado" | "descartado") => {
    if (status === "confirmado" && (!destino || !texto.trim())) return;
    setOcupado(true);
    const agora = new Date().toISOString();
    const patch =
      status === "confirmado"
        ? {
            status,
            texto: texto.trim(),
            destino_final: destino,
            confirmado_em: agora,
            ...(aluno ? { aluno_id: aluno.id, aluno_nome: aluno.nome } : {}),
          }
        : { status };
    let { error } = await supabase.from("whatsapp_entradas").update(patch).eq("id", x.id);
    // Banco ainda sem o destino "Leitura e escrita" na regra da tabela: guarda
    // como registro do aluno e marca no payload, para a tela Criança
    // alfabetizada achar do mesmo jeito.
    if (error && status === "confirmado" && destino === "alfabetizacao" && error.code === "23514") {
      const base =
        x.payload && typeof x.payload === "object" && !Array.isArray(x.payload)
          ? (x.payload as Record<string, unknown>)
          : {};
      ({ error } = await supabase
        .from("whatsapp_entradas")
        .update({
          status,
          texto: texto.trim(),
          destino_final: "registro",
          confirmado_em: agora,
          ...(aluno ? { aluno_id: aluno.id, aluno_nome: aluno.nome } : {}),
          payload: { ...base, destino_extra: "alfabetizacao" },
        } as never)
        .eq("id", x.id));
    }
    setOcupado(false);
    if (error) {
      toast.error("Não consegui salvar. Tente de novo.");
      return;
    }
    toast.success(
      status === "confirmado"
        ? `Confirmado: ${destinoLabel(destino)}${nome ? ` · ${nome}` : ""}.`
        : "Mensagem descartada.",
    );
    onFeito(x.id);
  };

  return (
    <article className="cf-item" aria-label={nome ? `Mensagem sobre ${nome}` : "Mensagem"}>
      <div className="cf-top">
        <span className={"cf-ava" + (aluno ? "" : " sem")} aria-hidden>
          {aluno ? iniciais(aluno.nome) : nome && !emDuvida && !foraDaSala ? iniciais(nome) : "?"}
        </span>
        <span className="cf-who">
          <b>{nome || "Aluno não identificado"}</b>
          <span>
            {quando(x.recebido_em)}
            {aluno?.turma ? ` · ${aluno.turma}` : ""}
            {nome ? "" : " · escolha o destino ou descarte"}
          </span>
        </span>
        <span className="cf-tag">{x.tipo === "audio" ? "Áudio transcrito" : "Texto"}</span>
      </div>

      {emDuvida && (
        <div className="cf-qual" role="group" aria-label={`Qual ${nomeDaPergunta(nomeMsg)}?`}>
          <b>Qual {nomeDaPergunta(nomeMsg)}?</b>
          <div className="op">
            {resolvido.candidatos.map((c) => (
              <button key={c.id} type="button" onClick={() => escolher(c.id)}>
                {c.nome}
                {c.turma && <span>{c.turma}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {foraDaSala && !trocando && (
        <div className="cf-qual">
          <b>{nomeMsg} não está na Minha sala.</b>
          <button type="button" className="cf-link" onClick={() => setTrocando(true)}>
            Escolher o aluno
          </button>
        </div>
      )}
      {!emDuvida && !foraDaSala && !trocando && alunos.length > 0 && (
        <div>
          <button type="button" className="cf-link" onClick={() => setTrocando(true)}>
            {aluno ? "Trocar aluno" : "Escolher aluno"}
          </button>
        </div>
      )}
      {trocando && (
        <div>
          <label className="cf-dh" htmlFor={`cf-a-${x.id}`}>
            Aluno desta mensagem
          </label>
          <select
            id={`cf-a-${x.id}`}
            className="cf-sel"
            value={alunoId ?? ""}
            onChange={(e) => escolher(e.target.value || null)}
          >
            <option value="">Sem aluno (turma toda ou agenda)</option>
            {[...new Set(alunos.map((a) => a.turma || "Sem turma"))].map((t) => (
              <optgroup key={t} label={t}>
                {alunos
                  .filter((a) => (a.turma || "Sem turma") === t)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {editando ? (
        <div>
          <label className="cf-dh" htmlFor={`cf-t-${x.id}`}>
            Texto do registro
          </label>
          <textarea
            id={`cf-t-${x.id}`}
            className="cf-edit"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      ) : (
        <p className="cf-txt">“{texto}”</p>
      )}
      <div>
        <button type="button" className="cf-link" onClick={() => setEditando((v) => !v)}>
          {editando ? "Pronto" : "Editar texto"}
        </button>
      </div>

      <div>
        <div className="cf-dh" id={`cf-d-${x.id}`}>
          Para onde vai
        </div>
        <div className="cf-dests" role="group" aria-labelledby={`cf-d-${x.id}`}>
          {DESTINOS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={destino === d.id}
              onClick={() => setDestino(d.id)}
            >
              {d.label}
              {x.destino_sugerido === d.id && <span className="sug">(sugerido)</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="cf-act">
        <button
          type="button"
          className="pn-btn primary"
          disabled={ocupado || emDuvida || !destino || !texto.trim()}
          title={emDuvida ? `Escolha qual ${nomeDaPergunta(nomeMsg)} antes de confirmar` : undefined}
          onClick={() => void salvar("confirmado")}
        >
          Confirmar
        </button>
        <button
          type="button"
          className="pn-btn"
          disabled={ocupado}
          onClick={() => void salvar("descartado")}
        >
          Descartar
        </button>
      </div>
    </article>
  );
}
