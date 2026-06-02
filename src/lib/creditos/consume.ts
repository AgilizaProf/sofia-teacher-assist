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

// Contador de mensagens do chat Sofia — agora autoritativo no servidor.
// A RPC registrar_mensagem_sofia incrementa o contador por usuário (no banco,
// sob lock) e desconta 1 crédito a cada 10 mensagens. Substitui o antigo
// contador em localStorage, que era burlável (limpar o storage = chat grátis).
export async function registrarMensagemSofia(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.rpc("registrar_mensagem_sofia" as any, {
    _user_id: user.id,
  });
  if (error) {
    // Não derruba o chat por falha de contagem; apenas registra.
    console.warn("[registrarMensagemSofia] erro:", error.message);
    return;
  }
  const res = data as { charged?: boolean; reason?: string } | null;
  if (res?.charged === false && res?.reason === "creditos_insuficientes") {
    toast.warning("Créditos insuficientes para o bloco do chat.");
  }
}

// Helper de descrição padronizada para uso em documentos
export function descricaoDoc(tipo: string, nomeAluno?: string | null): string {
  return nomeAluno && nomeAluno.trim() ? `${tipo} — ${nomeAluno.trim()}` : tipo;
}
