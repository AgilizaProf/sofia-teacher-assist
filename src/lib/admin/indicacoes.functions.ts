import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Dados da aba Admin → Pessoas → Indicações. Lê com a chave de serviço
// (as tabelas de indicação só deixam cada pessoa ver as próprias), mas só
// responde para quem tem o papel de admin.

export type IndicacaoLinha = {
  id: string;
  quando: string;
  quemIndicou: string;
  indicado: string;
  plano: string;
  diasQuemIndicou: number;
  diasIndicado: number;
  creditada: boolean;
  creditaEm: string;
};

export type IndicacoesAdminDTO = {
  linhas: IndicacaoLinha[];
  ranking: { nome: string; total: number; creditadas: number; dias: number }[];
  eventos: { compartilhou: number; cadastrosViaLink: number; falhas: number };
};

export const getIndicacoesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IndicacoesAdminDTO> => {
    const { data: papel } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!papel) throw new Error("forbidden");

    const [{ data: refs }, { data: evs }] = await Promise.all([
      supabaseAdmin
        .from("referrals")
        .select(
          "id,created_at,credit_at,credited,plan,referrer_user_id,referred_user_id,referrer_bonus_days,referred_bonus_days",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("referral_events")
        .select("event")
        .in("event", [
          "ref_compartilhar",
          "ref_copiar_link",
          "ref_cadastro_via_link",
          "ref_registro_falhou",
        ])
        .limit(20000),
    ]);

    const ids = new Set<string>();
    (refs ?? []).forEach((r) => {
      ids.add(r.referrer_user_id);
      ids.add(r.referred_user_id);
    });
    const nomes = new Map<string, string>();
    if (ids.size) {
      const { data: perfis } = await supabaseAdmin
        .from("profiles")
        .select("user_id,display_name,email")
        .in("user_id", [...ids]);
      (perfis ?? []).forEach((p) => nomes.set(p.user_id, p.display_name || p.email || "Sem nome"));
    }
    const nome = (id: string) => nomes.get(id) ?? "Conta removida";

    const linhas: IndicacaoLinha[] = (refs ?? []).map((r) => ({
      id: r.id,
      quando: r.created_at,
      quemIndicou: nome(r.referrer_user_id),
      indicado: nome(r.referred_user_id),
      plano: r.plan,
      diasQuemIndicou: r.referrer_bonus_days ?? 0,
      diasIndicado: r.referred_bonus_days ?? 0,
      creditada: !!r.credited,
      creditaEm: r.credit_at,
    }));

    const porPessoa = new Map<
      string,
      { nome: string; total: number; creditadas: number; dias: number }
    >();
    (refs ?? []).forEach((r) => {
      const atual = porPessoa.get(r.referrer_user_id) ?? {
        nome: nome(r.referrer_user_id),
        total: 0,
        creditadas: 0,
        dias: 0,
      };
      atual.total += 1;
      if (r.credited) {
        atual.creditadas += 1;
        atual.dias += r.referrer_bonus_days ?? 0;
      }
      porPessoa.set(r.referrer_user_id, atual);
    });

    const conta = (nomesEv: string[]) =>
      (evs ?? []).filter((e) => nomesEv.includes(e.event)).length;
    return {
      linhas,
      ranking: [...porPessoa.values()].sort((a, b) => b.total - a.total).slice(0, 10),
      eventos: {
        compartilhou: conta(["ref_compartilhar", "ref_copiar_link"]),
        cadastrosViaLink: conta(["ref_cadastro_via_link"]),
        falhas: conta(["ref_registro_falhou"]),
      },
    };
  });
