import { createFileRoute } from "@tanstack/react-router";
import { Planejamento } from "@/pages/Planejamento";

// ─────────────────────────────────────────────────────────────────────────────
// Sanitização dos filtros do M6 (?tag, ?turma, ?aluno)
//
// Os filtros vêm da URL (deep-link da Sofia ou compartilhamento direto). Como
// é entrada pública não-confiável, normalizamos antes de chegar ao componente:
//
//   • Strings: trim, colapsa espaços, descarta vazios.
//   • Tamanho máximo: evita URLs gigantes / DoS de regex.
//   • Whitelist de caracteres: letras (incl. acentuadas), dígitos, espaço e
//     pontuação leve (-,'.·). Bloqueia <, >, {, }, $, \, etc. — que poderiam
//     ser tentativas de XSS, regex injection ou ataques visuais.
//   • Arrays / objetos / outros tipos viram undefined.
//
// O resultado: a tela nunca recebe um filtro malformado. Se a URL traz lixo,
// a aba M6 simplesmente abre sem filtro (e o banner de "filtros ativos" não
// aparece) em vez de quebrar ou exibir conteúdo indevido.
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_MAX_LEN = 80;
// Letras (com acentos), números, espaço e ` -,'.·` apenas.
const FILTER_ALLOWED_RE = /^[\p{L}\p{N}\s\-.,'·]+$/u;

function sanitizeFilter(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Colapsa whitespace e remove caracteres de controle.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  if (cleaned.length > FILTER_MAX_LEN) return undefined;
  if (!FILTER_ALLOWED_RE.test(cleaned)) return undefined;
  return cleaned;
}

type MKey = "m1" | "m2" | "m3" | "m4" | "m5" | "m6";
type Search = {
  m?: MKey;
  /** Filtro por tag do diário (M6). */
  tag?: string;
  /** Filtro por turma do diário (M6). */
  turma?: string;
  /** Filtro por nome de aluno mencionado no diário (M6). */
  aluno?: string;
};

export const Route = createFileRoute("/planejamento")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const ms: MKey[] = ["m1", "m2", "m3", "m4", "m5", "m6"];
    return {
      m: ms.includes(s.m as MKey) ? (s.m as MKey) : "m5",
      tag: sanitizeFilter(s.tag),
      turma: sanitizeFilter(s.turma),
      aluno: sanitizeFilter(s.aluno),
    };
  },
  head: () => ({
    meta: [
      { title: "Planejamento · Drag & drop e replicar — AgilizaProf" },
      { name: "description", content: "Planeje a semana com Sofia: arraste atividades entre dias, replique em outras turmas e ajuste em segundos." },
      { property: "og:title", content: "Planejamento · AgilizaProf" },
      { property: "og:description", content: "Drag & drop entre dias + replicar em N turmas. Choveu? Arrasta. Deu certo? Replica." },
    ],
  }),
  component: Planejamento,
});
