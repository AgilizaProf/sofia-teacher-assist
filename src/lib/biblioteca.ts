import { supabase } from "@/integrations/supabase/client";

// Guardar algo na Minha Biblioteca. A Biblioteca guarda só a ficha do item
// (tipo, título, ano, matéria, habilidades) e aponta para o conteúdo, que
// continua onde foi feito: o plano em planos_aula, a trilha em trilhas, o
// simulado e o jogo na conta da ferramenta.

export type TipoBiblioteca = "plano" | "atividade" | "ficha" | "simulado" | "jogo" | "sequencia";

export type ItemBiblioteca = {
  tipo: TipoBiblioteca;
  refId: string | null;
  titulo: string;
  /** "3º ano", "Pré II"… ou o número (0 = Educação Infantil). */
  ano?: string | number | null;
  componente?: string | null;
  habilidades?: string[];
};

export type ResultadoGuardar = { ok: boolean; jaEstava?: boolean; mensagem: string };

/** "3º ano B", "1o Ano", "Pré II", "Infantil 5" → número do ano (0 = EI). */
export function anoDaTurma(grade: string): number | null {
  const g = (grade || "").toLowerCase();
  const m = g.match(/([1-9])\s*(?:º|°|o|ª)?\s*ano/);
  if (m) return Number(m[1]);
  if (/infantil|(^|\s)pr[ée](\s|-|$)|pr[ée]-?escola|creche|maternal|berç/.test(g)) return 0;
  return null;
}

const RE_BNCC = /E[FI]\d{2}[A-Z]{2}\d{2}/g;

/** Códigos BNCC de um texto ou objeto qualquer, sem repetir. */
export function codigosBncc(valor: unknown): string[] {
  const achados = JSON.stringify(valor ?? "").toUpperCase().match(RE_BNCC) ?? [];
  return [...new Set(achados)].slice(0, 12);
}

export async function guardarNaBiblioteca(item: ItemBiblioteca): Promise<ResultadoGuardar> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensagem: "Entre na sua conta para guardar na Biblioteca." };

  const anoEscolar =
    typeof item.ano === "number"
      ? item.ano
      : /^\d$/.test(String(item.ano ?? "").trim())
        ? Number(String(item.ano).trim())
        : item.ano
          ? anoDaTurma(String(item.ano))
          : null;

  if (item.refId) {
    const { data: existe } = await supabase
      .from("biblioteca_itens")
      .select("id")
      .eq("user_id", user.id)
      .eq("tipo", item.tipo)
      .eq("ref_id", item.refId)
      .maybeSingle();
    if (existe) return { ok: true, jaEstava: true, mensagem: "Isso já está na sua Biblioteca." };
  }

  const { error } = await supabase.from("biblioteca_itens").insert({
    user_id: user.id,
    tipo: item.tipo,
    ref_id: item.refId,
    titulo: (item.titulo || "Sem título").slice(0, 200),
    ano_escolar: anoEscolar !== null && anoEscolar >= 0 && anoEscolar <= 9 ? anoEscolar : null,
    componente: item.componente || null,
    ano_letivo: new Date().getFullYear(),
    habilidades: (item.habilidades ?? []).slice(0, 12),
  });
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return {
        ok: false,
        mensagem: "A Minha Biblioteca ainda não foi ativada no banco de dados. Fale com o suporte do AgilizaProf.",
      };
    }
    return { ok: false, mensagem: "Não consegui guardar agora. Tente de novo em instantes." };
  }
  return { ok: true, mensagem: "Guardado na Minha Biblioteca." };
}

/** Para onde o botão "Abrir" da Biblioteca leva cada tipo de item. */
export function linkDoItem(tipo: string, refId: string | null): { to: string; search?: Record<string, string> } {
  switch (tipo) {
    case "plano":
    case "atividade":
      return refId ? { to: "/planejamento", search: { m: "atv", abrir: refId } } : { to: "/planejamento" };
    case "sequencia":
      return { to: "/planejamento", search: { m: "trilhas" } };
    case "simulado":
    case "ficha":
      return { to: "/questoes" };
    case "jogo":
      return { to: "/jogos" };
    default:
      return { to: "/" };
  }
}
