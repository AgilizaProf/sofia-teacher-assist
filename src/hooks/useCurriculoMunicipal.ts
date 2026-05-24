import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HabilidadeMunicipal = {
  codigo: string;
  descricao: string;
  ano: string;
  disciplina: string;
  eixo?: string;
};

export type CurriculoMunicipal = {
  id: string;
  municipio: string;
  estado: string;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_bytes: number;
  status: "processando" | "ativo" | "erro";
  erro_msg?: string | null;
  habilidades: HabilidadeMunicipal[];
  ativo: boolean;
  usar_municipal: boolean;
  ordem: 1 | 2;
  eh_padrao: boolean;
  created_at: string;
};

export function useCurriculoMunicipal() {
  const [curriculos, setCurriculos] = useState<CurriculoMunicipal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCurriculos([]); setLoading(false); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("user_curriculo_municipal")
        .select("*")
        .eq("user_id", user.id)
        .order("ordem", { ascending: true });
      setCurriculos((data as CurriculoMunicipal[]) ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Polling automático enquanto algum currículo estiver processando
  useEffect(() => {
    if (!curriculos.some((c) => c.status === "processando")) return;
    const timer = setInterval(() => { void load(); }, 3000);
    return () => clearInterval(timer);
  }, [curriculos, load]);

  const toggleUsarMunicipal = useCallback(async (id: string, usar: boolean) => {
    setCurriculos((cs) => cs.map((c) => c.id === id ? { ...c, usar_municipal: usar } : c));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("user_curriculo_municipal").update({ usar_municipal: usar }).eq("id", id);
  }, []);

  const definirPadrao = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurriculos((cs) => cs.map((c) => ({ ...c, eh_padrao: c.id === id })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    // Desmarcar todos primeiro (evita conflito com o índice único parcial)
    await sb.from("user_curriculo_municipal").update({ eh_padrao: false }).eq("user_id", user.id);
    await sb.from("user_curriculo_municipal").update({ eh_padrao: true }).eq("id", id);
    await load();
  }, [load]);

  const removerPorId = useCallback(async (id: string) => {
    const alvo = curriculos.find((c) => c.id === id);
    if (!alvo) return;
    await supabase.storage.from("documentos-professor").remove([alvo.arquivo_path]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("user_curriculo_municipal").delete().eq("id", id);
    setCurriculos((cs) => cs.filter((c) => c.id !== id));
  }, [curriculos]);

  const curriculoPadrao = useMemo<CurriculoMunicipal | null>(() => {
    if (curriculos.length === 0) return null;
    return curriculos.find((c) => c.eh_padrao) ?? curriculos[0];
  }, [curriculos]);

  const isAtivo = !!(curriculoPadrao && curriculoPadrao.status === "ativo" && curriculoPadrao.ativo && curriculoPadrao.usar_municipal);
  const nomeExibicao = curriculoPadrao ? `${curriculoPadrao.municipio}${curriculoPadrao.estado ? ` (${curriculoPadrao.estado})` : ""}` : null;

  // `curriculo` é mantido como alias de `curriculoPadrao` para compatibilidade
  // com páginas que ainda não migraram (Relatórios, Planejamento, Inclusão, etc.).
  return { curriculos, curriculoPadrao, curriculo: curriculoPadrao, loading, load, toggleUsarMunicipal, definirPadrao, removerPorId, isAtivo, nomeExibicao };
}
