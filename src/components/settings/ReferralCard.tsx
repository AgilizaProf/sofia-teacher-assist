import { useEffect, useMemo, useState } from "react";
import { Copy, Gift, Check, Share2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachPendingReferral } from "@/lib/referral";
import { trackReferral } from "@/lib/tracking";

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

const PUBLIC_SITE_URL = "https://agilizaprof.app.br";

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
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (!code) return "";
    return `${PUBLIC_SITE_URL}/${code}`;
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
    trackReferral("ref_visualizar_secao");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      void trackReferral("ref_copiar_link", { code });
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não consegui copiar — selecione e copie manualmente.");
    }
  }

  async function shareLink() {
    if (!link) return;
    void trackReferral("ref_compartilhar", { code, meta: { method: typeof navigator !== "undefined" && "share" in navigator ? "native" : "clipboard" } });
    const text = `Conheça a Sofia, sua assistente pedagógica. Use meu link e ganhe dias grátis: ${link}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "Sofia para educadores(as)",
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

  // A indicação agora é criada automaticamente pelo webhook do Mercado Pago
  // quando o indicado faz a 1ª compra paga (e, em casos especiais, por um
  // admin). Não há mais registro manual de compra pelo próprio usuário.

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
          Convide outro(a) educador(a) e ganhe 1 mês grátis
        </h3>
      </div>
      <p style={{ color: "#6B7691", fontSize: 13, margin: "0 0 14px" }}>
        Quem você indicar também ganha. Quando o(a) educador(a) indicado(a) fizer a 1ª compra, ambos(as) recebem o bônus
        após 7 dias de confirmação. Plano <b>anual</b>: <b>+30 dias de acesso e 1.500 créditos</b>. Plano <b>mensal</b>: <b>+7 dias de acesso e 375 créditos</b>.
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

          <div style={{ marginTop: 10, fontSize: 12.5 }}>
            <a href="/indicacoes" style={{ color: "#B8410E", fontWeight: 700, textDecoration: "underline" }}>
              Ver funil de indicação →
            </a>
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
                  ? " Compra registrada — o bônus libera após o período de confirmação (7 dias)."
                  : " Assine um plano para liberar o bônus de quem te indicou e o seu (acesso + créditos)."}
              </div>
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
