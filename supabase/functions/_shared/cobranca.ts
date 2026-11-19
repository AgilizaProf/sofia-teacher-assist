// Login obrigatório e cobrança de créditos feitas no servidor.
//
// Antes, as funções de IA aceitavam chamadas sem login (pulavam a checagem de
// créditos) e quem descontava os créditos era o navegador, depois da geração.
// Quem chamasse a função direto gerava de graça. Agora:
//   1) sem login válido a função responde "Sua sessão expirou" e não chama a IA;
//   2) o custo de cada operação é decidido aqui (nunca pelo app) e descontado
//      no servidor, logo depois que a IA devolve um resultado válido.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./sofia-router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Custos em créditos (mesma tabela de src/lib/creditos/policy.ts → CUSTOS). */
export const CUSTOS = {
  parecer_descritivo: 20,
  relatorio_inclusao: 20,
  pei_completo: 50,
  pei_modelo_rede: 10,
  plano_aula: 10,
  adaptacao_pcd: 10,
  atividade_gerada: 10,
  planejamento_semanal: 10,
  trilha_semestral: 10,
  anexar_rede: 100,
  anexar_agenda: 30,
} as const;

/** Resposta padrão quando não há login válido (o app mostra a mensagem). */
export function respostaSemLogin(cors: Record<string, string> = corsHeaders): Response {
  return new Response(
    JSON.stringify({ ok: false, error: "Sua sessão expirou. Entre de novo e tente outra vez." }),
    { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

/**
 * Descrição que aparece no extrato de créditos. O app pode mandar uma descrição
 * mais completa (com o nome do aluno) em `descricaoCobranca`; o valor cobrado
 * nunca vem do app.
 */
export function descricaoCobranca(body: unknown, padrao: string): string {
  const d = (body as { descricaoCobranca?: unknown } | null)?.descricaoCobranca;
  if (typeof d !== "string") return padrao;
  const limpa = d.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  return limpa || padrao;
}

/**
 * Desconta os créditos depois de uma geração bem-sucedida. Nunca lança: uma
 * falha aqui fica no log e não apaga o documento que a professora já recebeu.
 */
export async function cobrarCreditos(userId: string, custo: number, descricao: string): Promise<void> {
  if (!userId || !(custo > 0)) return;
  try {
    const { error } = await admin.rpc("consumir_creditos", {
      _user_id: userId,
      _quantidade: custo,
      _descricao: descricao,
    });
    if (error) console.error("[cobranca] consumir_creditos falhou", { userId, custo, erro: error.message });
  } catch (e) {
    console.error("[cobranca] consumir_creditos falhou", { userId, custo, erro: String(e) });
  }
}
