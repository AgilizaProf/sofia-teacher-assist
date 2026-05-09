import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;
const listeners = new Set<(v: boolean) => void>();

async function fetchEi(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("etapa_ensino,nivel_ensino")
    .eq("user_id", u.user.id)
    .maybeSingle();
  const isEi =
    data?.etapa_ensino === "ed_infantil" ||
    (data?.nivel_ensino || "").toLowerCase().includes("infantil");
  return isEi;
}

export function refreshEiMode() {
  cached = null;
  pending = null;
  void ensureEi().then((v) => listeners.forEach((l) => l(v)));
}

function ensureEi(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!pending) {
    pending = fetchEi().then((v) => {
      cached = v;
      return v;
    }).catch(() => false);
  }
  return pending;
}

/**
 * Returns true when the teacher's profile is set to Educação Infantil.
 * Use it to swap labels and CTAs across the app.
 */
export function useEiMode(): boolean {
  const [isEi, setIsEi] = useState<boolean>(cached ?? false);
  useEffect(() => {
    let alive = true;
    ensureEi().then((v) => { if (alive) setIsEi(v); });
    const fn = (v: boolean) => { if (alive) setIsEi(v); };
    listeners.add(fn);
    return () => { alive = false; listeners.delete(fn); };
  }, []);
  return isEi;
}

/** Map of swappable labels. Use ei[key] when useEiMode() is true. */
export const EI_TERMS = {
  // Top-level module names
  planejamento: "Roteiros de experiência",
  planoDeAula: "Roteiro de experiência",
  pareceres: "Relatórios de desenvolvimento",
  parecer: "Relatório de desenvolvimento",
  diarioDeBordo: "Diário de observação",
  // Generic terms
  alunos: "as crianças",
  aluno: "criança",
  habilidadeBNCC: "Direito de aprendizagem",
  disciplina: "Campo de experiência",
  objetivo: "Intenção pedagógica",
  avaliacao: "Observação e registro",
  atividade: "Vivência",
  exercicio: "Exploração",
} as const;

/** Convenience: returns the EI term when in EI mode, otherwise the fallback. */
export function useTerm(key: keyof typeof EI_TERMS, fallback: string): string {
  const isEi = useEiMode();
  return isEi ? EI_TERMS[key] : fallback;
}