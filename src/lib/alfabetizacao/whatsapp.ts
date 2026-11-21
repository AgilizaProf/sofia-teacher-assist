// Observações de leitura e escrita que chegaram pelo WhatsApp e que a
// professora confirmou em "Para confirmar" com o destino "Leitura e escrita".
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizar } from "./analise";

export const DESTINO_ALFA = "alfabetizacao";

export type ObsWhatsapp = {
  id: string;
  data: string;
  texto: string;
  alunoId: string | null;
  alunoNome: string | null;
};

type Linha = {
  id: string;
  recebido_em: string;
  texto: string | null;
  aluno_id: string | null;
  aluno_nome: string | null;
  destino_final: string | null;
  payload: unknown;
};

/** A mensagem foi confirmada para Leitura e escrita? */
export function ehDeAlfabetizacao(l: { destino_final: string | null; payload: unknown }): boolean {
  if (l.destino_final === DESTINO_ALFA) return true;
  const p = l.payload;
  return (
    !!p && typeof p === "object" && (p as Record<string, unknown>).destino_extra === DESTINO_ALFA
  );
}

/** Só as observações deste aluno (pelo id; sem id, pelo nome). */
export function obsDoAluno(lista: ObsWhatsapp[], alunoId: string, nome?: string): ObsWhatsapp[] {
  const n = normalizar(nome || "");
  return lista.filter(
    (o) => o.alunoId === alunoId || (!o.alunoId && !!n && normalizar(o.alunoNome || "") === n),
  );
}

/** Texto curto para a Sofia: as observações mais recentes, por aluno. */
export function obsParaSofia(lista: ObsWhatsapp[], limite = 900): string {
  const linhas: string[] = [];
  let total = 0;
  for (const o of lista) {
    const txt = o.texto.replace(/\s+/g, " ").trim();
    if (!txt) continue;
    const linha = `- ${o.alunoNome || "Aluno não identificado"}: ${txt.slice(0, 220)}`;
    if (total + linha.length > limite) break;
    linhas.push(linha);
    total += linha.length + 1;
  }
  return linhas.join("\n");
}

/**
 * Observações confirmadas para Leitura e escrita. Sem login, sem internet ou
 * sem a tabela no banco, devolve lista vazia.
 */
export function useObsWhatsapp(): ObsWhatsapp[] {
  const [lista, setLista] = useState<ObsWhatsapp[]>([]);
  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data, error } = await supabase
          .from("whatsapp_entradas")
          .select("id, recebido_em, texto, aluno_id, aluno_nome, destino_final, payload")
          .eq("user_id", session.user.id)
          .eq("status", "confirmado")
          .order("recebido_em", { ascending: false })
          .limit(300);
        if (error || !vivo) return;
        setLista(
          ((data ?? []) as Linha[]).filter(ehDeAlfabetizacao).map((l) => ({
            id: l.id,
            data: l.recebido_em,
            texto: l.texto || "",
            alunoId: l.aluno_id,
            alunoNome: l.aluno_nome,
          })),
        );
      } catch {
        // segue sem as observações
      }
    };
    void carregar();
    const de_novo = () => void carregar();
    window.addEventListener("aprof:wa-entradas", de_novo);
    return () => {
      vivo = false;
      window.removeEventListener("aprof:wa-entradas", de_novo);
    };
  }, []);
  return lista;
}
