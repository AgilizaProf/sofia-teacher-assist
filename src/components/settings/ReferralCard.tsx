import { useEffect, useMemo, useState } from "react";
import { Copy, Gift, Check, Sparkles, Share2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachPendingReferral } from "@/lib/referral";

type Referral = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  plan: "mensal" | "anual";
  purchased_at: string;
  credit_at: string;
  referrer_bonus_days: number;
  referred_bonus_days: number;
  credited: boolean;
};

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function ReferralCard() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [bonusTotal, setBonusTotal] = useState<number>(0);
  const [refs, setRefs] = useState<Referral[]>([]);
  const [myReferral, setMyReferral] = useState<Referral | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (!code) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/auth?ref=${code}`;
  }, [code]);

  async function load() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      setUserId(uid);
      await attachPendingReferral(uid);
      const { data: codeData } = await supabase.rpc("ensure_referral_code", { _uid: uid });
      await supabase.rpc("process_due_referrals", { _uid: uid });
      const { data: prof } = await supabase
        .from("profiles")
        .select("referral_code, referred_by_code, bonus_days_total")
        .eq("user_id", uid)
        .maybeSingle();
      setCode((prof?.referral_code as string) || (codeData as string) || "");
      setReferredBy((prof?.referred_by_code as string) || null);
      setBonusTotal(Number(prof?.bonus_days_total || 0));
      const { data: list } = await supabase
        .from("referrals")
        .select("*")
        .or(`referrer_user_id.eq.${uid},referred_user_id.eq.${uid}`)
        .order("created_at", { ascending: false });
      const all = (list || []) as Referral[];
      setRefs(all.filter((r) => r.referrer_user_id === uid));
      setMyReferral(all.find((r) => r.referred_user_id === uid) || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não consegui copiar — selecione e copie manualmente.");
    }
  }

  async function shareLink() {
    if (!link) return;
    const text = `Conheça a Sofia, sua assistente pedagógica. Use meu link e ganhe dias grátis: ${link}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "Sofia para professoras",
          text,
          url: link,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copyLink();
  }

  async function simularCompra(plan: "mensal" | "anual") {
    if (!userId) return;
    if (myReferral) {
      toast.info("Você já registrou uma compra de indicação.");
      return;
    }
    if (!referredBy) {
      toast.error("Você não foi indicada por ninguém.");
      return;
    }
    setBusy(true);
    try {
      const { data: refProf, error: refErr } = await supabase
        .from("profiles")
        .select("user_id, referral_code")
        .eq("referral_code", referredBy)
        .maybeSingle();
      if (refErr) throw refErr;
      if (!refProf || refProf.user_id === userId) {
        toast.error("Código de indicação inválido.");
        return;
      }
      const bonus = plan === "anual" ? 30 : 7;
      const purchased = new Date();
      const credit = new Date(purchased.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { error } = await supabase.from("referrals").insert({
        referrer_user_id: refProf.user_id,
        referred_user_id: userId,
        referral_code: referredBy,
        plan,
        purchased_at: purchased.toISOString(),
        credit_at: credit.toISOString(),
        referrer_bonus_days: bonus,
        referred_bonus_days: bonus,
      });
      if (error) throw error;
      toast.success(
        `Compra registrada! Em 7 dias, você e quem te indicou ganham +${bonus} dias.`,
      );
      load();
    } catch (e) {
      toast.error("Não foi possível registrar a compra simulada.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  const pendentes = refs.filter((r) => !r.credited).length;
  const creditadas = refs.filter((r) => r.credited).length;

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#FFF7F0 0%,#FFF1E8 100%)",
        border: "1px solid #FED7AA",
        borderRadius: 14,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Gift size={20} color="#B8410E" />
        <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 700, margin: 0, color: "#1B2A4E" }}>
          Convide outra professora e ganhe 1 mês grátis
        </h3>
      </div>
      <p style={{ color: "#6B7691", fontSize: 13, margin: "0 0 14px" }}>
        Ela também ganha. Quando a professora indicada fizer a 1ª compra, vocês duas recebem o bônus
        após 7 dias de confirmação. Plano <b>anual</b>: <b>+30 dias</b>. Plano <b>mensal</b>: <b>+7 dias</b>.
      </p>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7691", fontSize: 13 }}>
          <Loader2 size={14} className="animate-spin" /> Carregando seu código…
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: 14 }}>
            <Stat label="Bônus acumulado" value={`${bonusTotal} dias`} accent />
            <Stat label="Indicações creditadas" value={String(creditadas)} />
            <Stat label="Aguardando 7 dias" value={String(pendentes)} />
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #E4E8F0",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "#6B7691", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
                Seu código
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: "#B8410E", letterSpacing: ".05em" }}>
                  {code || "—"}
                </span>
                <span style={{ fontSize: 12, color: "#6B7691", wordBreak: "break-all" }}>{link}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={copyLink} style={btn("ghost")}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiado" : "Copiar link"}
              </button>
              <button type="button" onClick={shareLink} style={btn("primary")}>
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
          </div>

          {refs.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4E", marginBottom: 6 }}>
                Suas indicações
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {refs.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 12px",
                      background: "#fff",
                      border: "1px solid #E4E8F0",
                      borderRadius: 8,
                      fontSize: 12.5,
                    }}
                  >
                    <span>
                      Plano <b>{r.plan}</b> · +{r.referrer_bonus_days} dias para você
                    </span>
                    {r.credited ? (
                      <span style={{ color: "#15803D", display: "inline-flex", gap: 4, alignItems: "center", fontWeight: 600 }}>
                        <Check size={13} /> Creditado
                      </span>
                    ) : (
                      <span style={{ color: "#B8410E", display: "inline-flex", gap: 4, alignItems: "center", fontWeight: 600 }}>
                        <Clock size={13} /> Libera em {daysUntil(r.credit_at)}d
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {referredBy && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "#fff",
                border: "1px dashed #FED7AA",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12.5, color: "#1B2A4E", marginBottom: 8 }}>
                Você foi indicada com o código <b style={{ fontFamily: "'JetBrains Mono',monospace", color: "#B8410E" }}>{referredBy}</b>.
                {myReferral
                  ? " Compra já registrada — bônus libera no prazo."
                  : " Registre sua 1ª compra para liberar o bônus de quem te indicou (e o seu)."}
              </div>
              {!myReferral && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" disabled={busy} onClick={() => simularCompra("mensal")} style={btn("ghost")}>
                    <Sparkles size={13} /> Registrei plano mensal (+7 dias)
                  </button>
                  <button type="button" disabled={busy} onClick={() => simularCompra("anual")} style={btn("primary")}>
                    <Sparkles size={13} /> Registrei plano anual (+30 dias)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? "#FF7A45" : "#fff",
        color: accent ? "#fff" : "#1B2A4E",
        border: accent ? "none" : "1px solid #E4E8F0",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 11, opacity: accent ? 0.9 : 0.7, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function btn(kind: "primary" | "ghost"): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#FF7A45",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "8px 12px",
      fontWeight: 600,
      fontSize: 12.5,
      cursor: "pointer",
    };
  }
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: "#1B2A4E",
    border: "1px solid #E4E8F0",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 600,
    fontSize: 12.5,
    cursor: "pointer",
  };
}