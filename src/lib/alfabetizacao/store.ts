// Onde ficam as avaliações de leitura e de escrita: na conta da professora
// (app_snapshots, chave "alfa_dados"), como as outras telas do app.
import { useCallback, useMemo } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import {
  ALFA_VAZIO,
  METAS_PADRAO,
  nomeNivelEscrita,
  nomeNivelLeitura,
  type AlfaDados,
  type AvaliacaoEscrita,
  type AvaliacaoLeitura,
} from "./tipos";
import { errosPorCategoria } from "./erros";

export const CHAVE_ALFA = "alfa_dados";

export function sanear(d: Partial<AlfaDados> | null | undefined): AlfaDados {
  return {
    leituras: Array.isArray(d?.leituras) ? d!.leituras : [],
    escritas: Array.isArray(d?.escritas) ? d!.escritas : [],
    metas: { ...METAS_PADRAO, ...(d?.metas && typeof d.metas === "object" ? d.metas : {}) },
  };
}

export function novoId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const porData = <T extends { data: string }>(a: T, b: T) => (a.data < b.data ? -1 : 1);

export function leiturasDoAluno(d: AlfaDados, alunoId: string): AvaliacaoLeitura[] {
  return d.leituras.filter((l) => l.alunoId === alunoId).sort(porData);
}

export function escritasDoAluno(d: AlfaDados, alunoId: string): AvaliacaoEscrita[] {
  return d.escritas.filter((e) => e.alunoId === alunoId).sort(porData);
}

export function dataCurta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * Resumo em texto do que a professora confirmou sobre a leitura e a escrita
 * de um aluno. É o que vai para a Sofia e para o parecer.
 * Procura pelo id; se não achar, pelo nome (ex.: aluno recadastrado).
 */
export function resumoDoAluno(d: AlfaDados, alunoId: string, nome?: string): string {
  const igual = (x: { alunoId: string; alunoNome: string }) =>
    x.alunoId === alunoId ||
    (!!nome && x.alunoNome.trim().toLowerCase() === nome.trim().toLowerCase());
  const ls = d.leituras.filter(igual).sort(porData);
  const es = d.escritas.filter(igual).sort(porData);
  const partes: string[] = [];
  if (ls.length) {
    const u = ls[ls.length - 1];
    let t = `Leitura (${dataCurta(u.data)}): ${nomeNivelLeitura(u.nivel)}`;
    if (u.tipo === "texto" || u.tipo === "frases")
      t += `, ${u.pcpm} palavras certas por minuto, ${Math.round(u.precisao * 100)}% de acerto`;
    if (ls.length > 1) {
      const p = ls[0];
      t +=
        p.nivel === u.nivel
          ? `. Na primeira avaliação (${dataCurta(p.data)}) estava no mesmo nível`
          : `. Na primeira avaliação (${dataCurta(p.data)}) era ${nomeNivelLeitura(p.nivel)}`;
    }
    if (u.obs) t += `. Observação: ${u.obs}`;
    partes.push(t + ".");
  }
  if (es.length) {
    const u = es[es.length - 1];
    let t = `Escrita (${dataCurta(u.data)}): nível ${nomeNivelEscrita(u.nivel)}`;
    const cats = errosPorCategoria(u.erros)
      .filter((g) => g.cat.id !== "outro")
      .slice(0, 3)
      .map((g) => g.cat.nome);
    if (cats.length) t += `; ainda precisa de apoio em: ${cats.join(", ")}`;
    if (es.length > 1 && es[0].nivel !== u.nivel)
      t += `. Na primeira produção (${dataCurta(es[0].data)}) era ${nomeNivelEscrita(es[0].nivel)}`;
    if (u.pontosFortes) t += `. Pontos fortes: ${u.pontosFortes}`;
    partes.push(t.replace(/\.+$/, "") + ".");
  }
  return partes.join(" ");
}

/** Resumo de vários alunos, um por linha, para o contexto da Sofia. */
export function resumoParaSofia(
  d: AlfaDados,
  alunos: Array<{ id: string; nome: string; turma?: string }>,
  limite = 2800,
): string {
  const linhas: string[] = [];
  let total = 0;
  for (const a of alunos) {
    const r = resumoDoAluno(d, a.id, a.nome);
    if (!r) continue;
    const linha = `- ${a.nome}${a.turma ? ` (${a.turma})` : ""}: ${r}`;
    if (total + linha.length > limite) break;
    linhas.push(linha);
    total += linha.length + 1;
  }
  return linhas.join("\n");
}

export function useAlfaDados() {
  const [bruto, setBruto] = usePersistentState<AlfaDados>(CHAVE_ALFA, ALFA_VAZIO);
  const dados = useMemo(() => sanear(bruto), [bruto]);

  const salvarLeitura = useCallback(
    (l: AvaliacaoLeitura) =>
      setBruto((d) => ({ ...sanear(d), leituras: [...sanear(d).leituras, l] })),
    [setBruto],
  );
  const salvarEscrita = useCallback(
    (e: AvaliacaoEscrita) =>
      setBruto((d) => {
        const s = sanear(d);
        const outras = s.escritas.filter((x) => x.id !== e.id);
        return { ...s, escritas: [...outras, e] };
      }),
    [setBruto],
  );
  const apagarLeitura = useCallback(
    (id: string) =>
      setBruto((d) => ({ ...sanear(d), leituras: sanear(d).leituras.filter((x) => x.id !== id) })),
    [setBruto],
  );
  const apagarEscrita = useCallback(
    (id: string) =>
      setBruto((d) => ({ ...sanear(d), escritas: sanear(d).escritas.filter((x) => x.id !== id) })),
    [setBruto],
  );
  const salvarMetas = useCallback(
    (metas: Record<string, number>) => setBruto((d) => ({ ...sanear(d), metas })),
    [setBruto],
  );

  return { dados, salvarLeitura, salvarEscrita, apagarLeitura, apagarEscrita, salvarMetas };
}

/** Quem já tem leitura ou escrita registrada (pelo que foi salvo nas avaliações). */
export function alunosAvaliados(d: AlfaDados): Array<{ id: string; nome: string; turma?: string }> {
  const mapa = new Map<string, { id: string; nome: string; turma?: string }>();
  for (const x of [...d.leituras, ...d.escritas])
    mapa.set(x.alunoId, { id: x.alunoId, nome: x.alunoNome, turma: x.turma || undefined });
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
