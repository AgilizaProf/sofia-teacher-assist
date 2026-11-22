// Avaliar no papel: a professora imprime a folha da turma, marca o nível de
// cada aluno e manda a foto. O app lê as marcas (no próprio aparelho, sem IA
// e sem gastar créditos), ela confere e só então vai para a ficha dos alunos.
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  alunosDaPagina,
  codigoTexto,
  lerFolhaNaFoto,
  novoCodigo,
  paginasDaFolha,
  type FolhaSondagem,
} from "@/lib/alfabetizacao/folha";
import { abrirFoto } from "@/lib/alfabetizacao/folhaFoto";
import { htmlFolha } from "@/lib/alfabetizacao/folhaImprimir";
import { imprimirHtml } from "@/lib/alfabetizacao/imprimir";
import { novoId } from "@/lib/alfabetizacao/store";
import {
  CARTAO_FOLHA,
  NIVEIS_LEITURA,
  nomeNivelLeitura,
  type AlfaDados,
  type AvaliacaoLeitura,
  type NivelLeitura,
} from "@/lib/alfabetizacao/tipos";
import { COR_LEITURA, type AlunoAlfa } from "./comum";

type LinhaConf = { id: string; nome: string; nivel: NivelLeitura | null; duvida: boolean };

type Conferencia = {
  cod: number;
  turma: string;
  /** Página lida (0 = primeira) e quantas a folha tem; null quando é marcação na tela. */
  pagina: number | null;
  paginas: number;
  linhas: LinhaConf[];
};

function hojeLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const MSG_ERRO: Record<string, string> = {
  sem_cantos:
    "Não achei a folha na foto. Pode ser de perto ou de longe, mas a folha inteira precisa aparecer, com os quatro quadrados pretos dos cantos à mostra, em um lugar claro.",
  sem_codigo:
    "Achei uma folha, mas não consegui saber de qual turma ela é. A foto pode ter ficado cortada ou escura, ou a folha foi impressa em outra conta. Tente outra foto ou marque na tela.",
};

export function FolhaTurma({
  alunos,
  turma,
  dados,
  salvarFolha,
  salvarLeiturasDaFolha,
  pedirFoto,
}: {
  /** Alunos da turma escolhida no alto da tela. */
  alunos: AlunoAlfa[];
  turma: string;
  dados: AlfaDados;
  salvarFolha: (f: FolhaSondagem) => void;
  salvarLeiturasDaFolha: (cod: number, novas: AvaliacaoLeitura[]) => void;
  /** true quando a professora chegou pelo QR code da folha. */
  pedirFoto?: boolean;
}) {
  const arquivo = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [conf, setConf] = useState<Conferencia | null>(null);
  const [dia, setDia] = useState(hojeLocal());
  const [feito, setFeito] = useState<{ n: number; falta: number | null } | null>(null);

  const folhas = useMemo(() => dados.folhas || [], [dados.folhas]);
  const ordenados = useMemo(
    () => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [alunos],
  );
  const turmaDe = useMemo(() => new Map(alunos.map((a) => [a.id, a.turma])), [alunos]);

  function imprimir() {
    if (!ordenados.length) return;
    const lista = ordenados.map((a) => ({ id: a.id, nome: a.nome }));
    const hoje = hojeLocal();
    // mesma turma, mesmos alunos, mesmo dia: é a mesma folha (não gasta outro código)
    const igual = folhas.find(
      (f) =>
        f.turma === turma &&
        f.criada === hoje &&
        f.alunos.length === lista.length &&
        f.alunos.every((a, i) => a.id === lista[i].id),
    );
    const folha: FolhaSondagem = igual ?? {
      cod: novoCodigo(folhas.map((f) => f.cod)),
      turma,
      criada: hoje,
      alunos: lista,
    };
    if (!igual) salvarFolha(folha);
    const link = `${window.location.origin}/alfabetizacao?folha=${codigoTexto(folha.cod)}`;
    if (!imprimirHtml(htmlFolha(folha, link)))
      toast.error("O navegador bloqueou a janela de impressão. Libere os pop-ups e tente de novo.");
  }

  async function lerFoto(f: File | undefined) {
    if (!f) return;
    setErro("");
    setFeito(null);
    setLendo(true);
    try {
      const foto = await abrirFoto(f);
      // deixa a tela mostrar "Lendo…" antes da conta pesada
      await new Promise((r) => setTimeout(r, 30));
      let r;
      try {
        r = lerFolhaNaFoto(foto, (cod, pagina) => {
          const folha = folhas.find((x) => x.cod === cod);
          if (!folha) return null;
          const n = alunosDaPagina(folha, pagina).length;
          return n > 0 ? n : null;
        });
      } finally {
        foto.fechar();
      }
      if (!r.ok) {
        setErro(MSG_ERRO[r.motivo]);
        return;
      }
      const folha = folhas.find((x) => x.cod === r.cod)!;
      const daPagina = alunosDaPagina(folha, r.pagina);
      setConf({
        cod: folha.cod,
        turma: folha.turma,
        pagina: r.pagina,
        paginas: paginasDaFolha(folha),
        linhas: daPagina.map((a, i) => ({
          id: a.id,
          nome: a.nome,
          nivel: r.linhas[i]?.nivel ?? null,
          duvida: !!r.linhas[i]?.duvida,
        })),
      });
    } catch {
      setErro("Não consegui abrir esta foto. Tente tirar outra.");
    } finally {
      setLendo(false);
    }
  }

  function marcarNaTela() {
    setErro("");
    setFeito(null);
    setConf({
      cod: novoCodigo(folhas.map((f) => f.cod)),
      turma,
      pagina: null,
      paginas: 1,
      linhas: ordenados.map((a) => ({ id: a.id, nome: a.nome, nivel: null, duvida: false })),
    });
  }

  function mudar(id: string, nivel: NivelLeitura | null) {
    setConf((c) =>
      c
        ? {
            ...c,
            linhas: c.linhas.map((l) => (l.id === id ? { ...l, nivel, duvida: false } : l)),
          }
        : c,
    );
  }

  function gravar() {
    if (!conf) return;
    const data = `${/^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hojeLocal()}T12:00:00.000Z`;
    const novas: AvaliacaoLeitura[] = conf.linhas
      .filter((l) => l.nivel !== null)
      .map((l) => ({
        id: novoId("lei"),
        alunoId: l.id,
        alunoNome: l.nome,
        turma: turmaDe.get(l.id) || conf.turma || "",
        data,
        cartaoId: CARTAO_FOLHA,
        cartaoNivel: 0,
        tipo: "palavras",
        total: 0,
        lidas: 0,
        corretas: 0,
        precisao: 0,
        pcpm: 0,
        segundos: 0,
        nivelSugerido: l.nivel as NivelLeitura,
        nivel: l.nivel as NivelLeitura,
        folha: conf.cod,
      }));
    if (!novas.length) {
      toast.error("Nenhum aluno com nível marcado.");
      return;
    }
    salvarLeiturasDaFolha(conf.cod, novas);
    const falta =
      conf.pagina !== null && conf.paginas > 1 && conf.pagina + 1 < conf.paginas
        ? conf.pagina + 2
        : null;
    setFeito({ n: novas.length, falta });
    setConf(null);
    toast.success(
      `${novas.length} ${novas.length === 1 ? "aluno gravado" : "alunos gravados"} na ficha.`,
    );
  }

  const input = (
    <input
      ref={arquivo}
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      onChange={(e) => {
        void lerFoto(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (conf) {
    const comNivel = conf.linhas.filter((l) => l.nivel !== null).length;
    const duvidas = conf.linhas.filter((l) => l.duvida).length;
    return (
      <div className="af-card forte">
        {input}
        <h2>Confira antes de gravar</h2>
        <p className="dica">
          {conf.pagina === null
            ? "Toque no nível de cada aluno. Deixe sem nível quem não leu."
            : "Veja se o app leu certo o que você marcou. Toque em outro número para corrigir."}{" "}
          {conf.turma ? `Turma ${conf.turma}. ` : ""}
          {conf.pagina !== null
            ? `Folha ${codigoTexto(conf.cod)}${conf.paginas > 1 ? `, página ${conf.pagina + 1} de ${conf.paginas}` : ""}.`
            : ""}
        </p>
        {duvidas > 0 && (
          <div className="af-aviso sol">
            {duvidas === 1
              ? "Em 1 linha fiquei em dúvida (marca fraca ou duas marcas). Ela está destacada."
              : `Em ${duvidas} linhas fiquei em dúvida (marca fraca ou duas marcas). Elas estão destacadas.`}
          </div>
        )}
        <div className="af-fl">
          {conf.linhas.map((l, i) => (
            <div key={l.id} className={"af-fl-l" + (l.duvida ? " duv" : "")}>
              <div className="nm">
                <b>
                  {i + 1}. {l.nome}
                </b>
                <span>
                  {l.nivel ? nomeNivelLeitura(l.nivel) : "Sem nível (não grava)"}
                  {l.duvida ? " · confira" : ""}
                </span>
              </div>
              <div className="nv" role="group" aria-label={`Nível de ${l.nome}`}>
                {NIVEIS_LEITURA.map((n) => (
                  <button
                    key={n.n}
                    type="button"
                    title={n.nome}
                    aria-label={n.nome}
                    aria-pressed={l.nivel === n.n}
                    style={l.nivel === n.n ? { background: COR_LEITURA[n.n] } : undefined}
                    onClick={() => mudar(l.id, l.nivel === n.n ? null : n.n)}
                  >
                    {n.n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="af-linha" style={{ marginTop: 12 }}>
          <label className="af-campo" style={{ maxWidth: 220 }}>
            Dia da leitura
            <input
              type="date"
              value={dia}
              max={hojeLocal()}
              onChange={(e) => setDia(e.target.value)}
            />
          </label>
        </div>
        <div className="af-botoes">
          <button type="button" className="pn-btn primary" onClick={gravar}>
            Gravar {comNivel} {comNivel === 1 ? "aluno" : "alunos"} na ficha
          </button>
          <button type="button" className="pn-btn" onClick={() => setConf(null)}>
            Descartar
          </button>
        </div>
        <p className="dica" style={{ margin: "10px 0 0" }}>
          A foto não fica guardada. Só os níveis que você confirmar.
        </p>
      </div>
    );
  }

  return (
    <div className="af-card">
      {input}
      <h2>Avaliar no papel, com a folha da turma</h2>
      <p className="dica">
        Imprima a folha com o nome dos alunos, ouça cada um ler e marque um X no nível dele. Depois
        tire uma foto da folha: o app lê as marcas, você confere e vai para a ficha de cada aluno.
        Não gasta créditos.
      </p>
      {pedirFoto && !feito && (
        <div className="af-aviso">
          Você abriu pelo QR code da folha. Agora é só tirar a foto dela com os quatro quadrados
          pretos dos cantos aparecendo.
        </div>
      )}
      {feito && (
        <div className="af-aviso">
          Pronto: {feito.n} {feito.n === 1 ? "aluno gravado" : "alunos gravados"}. Os níveis já
          aparecem na aba Turma e na ficha de cada um.
          {feito.falta ? ` Falta enviar a foto da página ${feito.falta}.` : ""}
        </div>
      )}
      {erro && <div className="af-aviso sol">{erro}</div>}
      <div className="af-botoes" style={{ marginTop: 4 }}>
        <button type="button" className="pn-btn" disabled={!ordenados.length} onClick={imprimir}>
          Imprimir a folha da turma{turma ? ` (${turma})` : ""}
        </button>
        <button
          type="button"
          className="pn-btn primary"
          disabled={lendo}
          onClick={() => arquivo.current?.click()}
        >
          {lendo ? "Lendo a foto…" : "Enviar a foto da folha"}
        </button>
        <button
          type="button"
          className="af-link"
          disabled={!ordenados.length}
          onClick={marcarNaTela}
        >
          Marcar na tela, sem foto
        </button>
      </div>
      {!ordenados.length && (
        <p className="dica" style={{ margin: "10px 0 0" }}>
          Cadastre os alunos na aba Turma para imprimir a folha.
        </p>
      )}
    </div>
  );
}
