import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/indicacoes")({
  head: () => ({
    meta: [
      { title: "Funil de indicação · AgilizaProf" },
      { name: "description", content: "Acompanhe cliques, cadastros e conversões do seu link de indicação." },
    ],
  }),
  component: IndicacoesPage,
});

type Evt = {
  id: string;
  event: string;
  referral_code: string | null;
  referred_user_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type Ref = {
  id: string;
  referred_user_id: string;
  plan: string;
  purchased_at: string;
  credit_at: string;
  credited: boolean;
  created_at: string;
};

const NAVY = "#1B2A4E";
const MUTED = "#6B7691";
const BORDER = "#E4E8F0";
const ACCENT = "#FF7A45";

const EVENT_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  ref_visualizar_secao:  { label: "Visualizou seção",      bg: "#EEF2FF", fg: "#3730A3" },
  ref_copiar_link:       { label: "Copiou link",           bg: "#E0F2FE", fg: "#075985" },
  ref_compartilhar:      { label: "Compartilhou",          bg: "#FCE7F3", fg: "#9D174D" },
  ref_cadastro_via_link: { label: "Clique no link",        bg: "#FEF3C7", fg: "#92400E" },
  ref_registrado:        { label: "Indicado cadastrou",    bg: "#DCFCE7", fg: "#166534" },
  ref_registro_falhou:   { label: "Falha no vínculo",      bg: "#FEE2E2", fg: "#991B1B" },
  ref_conversao:         { label: "Conversão (compra)",    bg: "#FFE4D6", fg: "#9A3412" },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function IndicacoesPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Evt[]>([]);
  const [referrals, setReferrals] = useState<Ref[]>([]);
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) { setLoading(false); return; }
        const [{ data: prof }, { data: evs }, { data: refs }] = await Promise.all([
          supabase.from("profiles").select("referral_code").eq("user_id", uid).maybeSingle(),
          supabase
            .from("referral_events" as never)
            .select("*")
            .eq("referrer_user_id", uid)
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("referrals")
            .select("*")
            .eq("referrer_user_id", uid)
            .order("created_at", { ascending: false }),
        ]);
        setCode((prof as { referral_code?: string } | null)?.referral_code || "");
        setEvents((evs as unknown as Evt[]) || []);
        setReferrals((refs as unknown as Ref[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach((e) => { c[e.event] = (c[e.event] || 0) + 1; });
    return c;
  }, [events]);

  const conversoes = referrals.length;
  const creditadas = referrals.filter((r) => r.credited).length;

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", color: NAVY, background: "#F4F6FB", minHeight: "100vh", padding: "28px 24px 48px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 30, margin: 0, letterSpacing: "-0.02em" }}>
            Funil de indicação
          </h1>
          <p style={{ color: MUTED, fontSize: 14, margin: "6px 0 0" }}>
            Acompanhe quem clicou no seu link, quem se cadastrou e quem virou cliente pagante.
            {code ? <> Seu código: <b style={{ color: ACCENT, fontFamily: "'JetBrains Mono',monospace" }}>{code}</b>.</> : null}
          </p>
        </header>

        {/* Cards do funil */}
        <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", marginBottom: 22 }}>
          <Stat label="Cliques no link" value={counts.ref_cadastro_via_link || 0} hint="Visitantes via /CODIGO" />
          <Stat label="Cadastros vinculados" value={counts.ref_registrado || 0} hint="Conta criada com seu código" />
          <Stat label="Conversões (compra)" value={conversoes} hint="Indicados que assinaram" />
          <Stat label="Bônus já creditados" value={creditadas} hint="Após período de confirmação" accent />
          <Stat label="Cópias de link" value={counts.ref_copiar_link || 0} muted />
          <Stat label="Compartilhamentos" value={counts.ref_compartilhar || 0} muted />
          <Stat label="Falhas de vínculo" value={counts.ref_registro_falhou || 0} muted />
        </section>

        {/* Linha do tempo de eventos */}
        <section style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 22 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, margin: "0 0 4px" }}>Linha do tempo</h2>
          <p style={{ color: MUTED, fontSize: 12.5, margin: "0 0 14px" }}>Últimos 500 eventos do seu funil, do mais recente para o mais antigo.</p>
          {loading ? (
            <div style={{ color: MUTED, fontSize: 13 }}>Carregando…</div>
          ) : events.length === 0 ? (
            <EmptyState text="Nenhum evento ainda. Quando alguém clicar, copiar ou se cadastrar pelo seu link, aparece aqui." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    <th style={th}>Quando</th>
                    <th style={th}>Evento</th>
                    <th style={th}>Código</th>
                    <th style={th}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const info = EVENT_LABEL[e.event] || { label: e.event, bg: "#F1F5F9", fg: "#475569" };
                    return (
                      <tr key={e.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={td}>{fmtDate(e.created_at)}</td>
                        <td style={td}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 800, background: info.bg, color: info.fg }}>
                            {info.label}
                          </span>
                        </td>
                        <td style={{ ...td, fontFamily: "'JetBrains Mono',monospace", color: ACCENT }}>{e.referral_code || "—"}</td>
                        <td style={{ ...td, color: MUTED }}>{describeMeta(e.event, e.meta)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Conversões pagas */}
        <section style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, margin: "0 0 4px" }}>Conversões pagas</h2>
          <p style={{ color: MUTED, fontSize: 12.5, margin: "0 0 14px" }}>Compras confirmadas dos seus indicados (registradas pelo webhook do Mercado Pago).</p>
          {loading ? (
            <div style={{ color: MUTED, fontSize: 13 }}>Carregando…</div>
          ) : referrals.length === 0 ? (
            <EmptyState text="Nenhuma conversão paga ainda. Quando alguém indicado assinar, aparece aqui com status do crédito." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    <th style={th}>Compra</th>
                    <th style={th}>Plano</th>
                    <th style={th}>Libera em</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={td}>{fmtDate(r.purchased_at)}</td>
                      <td style={{ ...td, textTransform: "capitalize", fontWeight: 700 }}>{r.plan}</td>
                      <td style={td}>{fmtDate(r.credit_at)}</td>
                      <td style={td}>
                        {r.credited ? (
                          <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 800, background: "#DCFCE7", color: "#166534" }}>Creditado</span>
                        ) : (
                          <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 800, background: "#FEF3C7", color: "#92400E" }}>Aguardando</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 700 };
const td: React.CSSProperties = { padding: "10px", verticalAlign: "top" };

function Stat({ label, value, hint, accent, muted }: { label: string; value: number | string; hint?: string; accent?: boolean; muted?: boolean }) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${ACCENT}, #FF9466)` : "#fff",
      color: accent ? "#fff" : NAVY,
      border: accent ? "none" : `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "14px 16px",
      opacity: muted ? 0.85 : 1,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: accent ? "rgba(255,255,255,.85)" : MUTED }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 800, lineHeight: 1.05, marginTop: 4 }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, marginTop: 4, color: accent ? "rgba(255,255,255,.85)" : MUTED }}>{hint}</div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 18, fontSize: 13, color: MUTED, textAlign: "center" }}>
      {text}
    </div>
  );
}

function describeMeta(event: string, meta: Record<string, unknown> | null): string {
  if (!meta) return "—";
  if (event === "ref_registro_falhou" && typeof meta.reason === "string") return `Motivo: ${meta.reason}`;
  if (event === "ref_compartilhar" && typeof meta.method === "string") return `Via ${meta.method}`;
  if (event === "ref_cadastro_via_link" && typeof meta.referrer === "string" && meta.referrer) return `De ${meta.referrer}`;
  try { return JSON.stringify(meta); } catch { return "—"; }
}