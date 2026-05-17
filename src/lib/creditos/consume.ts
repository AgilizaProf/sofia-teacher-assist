// Helpers para consumo de créditos.
// Use APÓS sucesso da operação — nunca antes.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConsumirResult =
  | { ok: true; saldo: number }
  | { ok: false; motivo: "no_user" | "insuficiente" | "erro"; saldoAtual?: number; mensagem?: string };

export async function consumirCreditos(
  quantidade: number,
  descricao: string,
): Promise<ConsumirResult> {
  if (quantidade <= 0) return { ok: true, saldo: -1 };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, motivo: "no_user" };
  const { data, error } = await supabase.rpc("consumir_creditos" as any, {
    _user_id: user.id,
    _quantidade: quantidade,
    _descricao: descricao,
  });
  if (error) {
    if ((error as any).message?.includes("creditos_insuficientes")) {
      return { ok: false, motivo: "insuficiente", mensagem: error.message };
    }
    console.error("[consumirCreditos] erro:", error);
    return { ok: false, motivo: "erro", mensagem: error.message };
  }
  const saldo = Number((data as any)?.saldo ?? 0);
  return { ok: true, saldo };
}

// Contador de mensagens do chat Sofia.
// A cada 10 mensagens enviadas pelo usuário, desconta 1 crédito.
const CHAT_COUNTER_KEY = "agp:sofia_msg_counter:v2";
const CHAT_MSGS_POR_BLOCO = 10;
const CHAT_CUSTO_BLOCO = 1;

export async function registrarMensagemSofia(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  const cur = Number(localStorage.getItem(CHAT_COUNTER_KEY) ?? 0);
  const next = cur + 1;
  if (next >= CHAT_MSGS_POR_BLOCO) {
    localStorage.setItem(CHAT_COUNTER_KEY, "0");
    const r = await consumirCreditos(
      CHAT_CUSTO_BLOCO,
      `Chat Sofia (${CHAT_MSGS_POR_BLOCO} mensagens)`,
    );
    if (!r.ok && r.motivo === "insuficiente") {
      toast.warning("Créditos insuficientes para o bloco do chat.");
    }
  } else {
    localStorage.setItem(CHAT_COUNTER_KEY, String(next));
  }
}

// Helper de descrição padronizada para uso em documentos
export function descricaoDoc(tipo: string, nomeAluno?: string | null): string {
  return nomeAluno && nomeAluno.trim() ? `${tipo} — ${nomeAluno.trim()}` : tipo;
}