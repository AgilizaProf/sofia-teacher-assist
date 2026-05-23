import { useState, useEffect, useCallback } from "react";
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
  created_at: string;
};

export function useCurriculoMunicipal() {
  const [curriculo, setCurriculo] = useState<CurriculoMunicipal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("user_curriculo_municipal")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCurriculo(data as CurriculoMunicipal | null);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Polling automático enquanto status = processando (verifica a cada 3s)
  useEffect(() => {
    if (curriculo?.status !== "processando") return;
    const timer = setInterval(() => { void load(); }, 3000);
    return () => clearInterval(timer);
  }, [curriculo?.status, load]);

  const toggleUsarMunicipal = useCallback(async (usar: boolean) => {
    if (!curriculo) return;
    setCurriculo((c) => c ? { ...c, usar_municipal: usar } : c);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("user_curriculo_municipal").update({ usar_municipal: usar }).eq("id", curriculo.id);
  }, [curriculo]);

  const remover = useCallback(async () => {
    if (!curriculo) return;
    // arquivo_path é o caminho real no bucket (userId/timestamp_curriculo.pdf)
    await supabase.storage.from("curriculos-municipais").remove([curriculo.arquivo_path]);
    await supabase.from("user_curriculo_municipal").delete().eq("id", curriculo.id);
    setCurriculo(null);
  }, [curriculo]);

  const isAtivo = curriculo?.status === "ativo" && curriculo?.ativo && curriculo?.usar_municipal;
  const nomeExibicao = curriculo ? `${curriculo.municipio}${curriculo.estado ? ` (${curriculo.estado})` : ""}` : null;

  return { curriculo, loading, load, toggleUsarMunicipal, remover, isAtivo, nomeExibicao };
}
