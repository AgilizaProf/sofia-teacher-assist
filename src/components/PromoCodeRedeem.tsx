import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Card em Configurações: a pessoa digita um código de desconto e,
 * se válido, aparecem os links de pagamento com desconto (mensal e/ou anual).
 * O pagamento é feito no Mercado Pago e ativado pelo webhook como um pagamento normal.
 */
export function PromoCodeRedeem() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "invalid" | "error">("idle");
  const [links, setLinks] = useState<{ mensal?: string; anual?: string }>({});

  async function aplicar() {
    const c = code.trim();
    if (!c) return;
    setStatus("loading");
    setLinks({});
    try {
      const { data, error } = await supabase.rpc("redeem_promo_code" as any, { p_code: c });
      if (error) {
        setStatus("error");
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as
        | { url_mensal?: string | null; url_anual?: string | null }
        | null
        | undefined;
      const m = row?.url_mensal || undefined;
      const a = row?.url_anual || undefined;
      if (row && (m || a)) {
        setLinks({ mensal: m, anual: a });
        setStatus("ok");
        void import("@/lib/admin/track").then(({ trackEvent }) =>
          trackEvent("promo_code_redeemed", { code: c }),
        );
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      aria-labelledby="cupom-title"
      style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 24, marginBottom: 18 }}
    >
      <h2
        id="cupom-title"
        style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}
      >
        Código de desconto
      </h2>
      <p style={{ color: "#6B7691", fontSize: 13, margin: "0 0 16px" }}>
        Tem um código promocional? Digite abaixo para liberar o link de pagamento com desconto.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void aplicar();
          }}
          placeholder="Digite o código"
          autoCapitalize="characters"
          style={{
            flex: "1 1 200px",
            minWidth: 0,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #CBD5E1",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={() => void aplicar()}
          disabled={status === "loading" || !code.trim()}
          style={{
            flexShrink: 0,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: "#FF7A45",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: status === "loading" || !code.trim() ? 0.6 : 1,
          }}
        >
          {status === "loading" ? "Validando..." : "Aplicar"}
        </button>
      </div>

      {status === "invalid" && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#DC2626" }}>Código inválido ou expirado.</div>
      )}
      {status === "error" && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#DC2626" }}>
          Não foi possível validar agora. Tente de novo.
        </div>
      )}

      {status === "ok" && (links.mensal || links.anual) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: "#10B981", fontWeight: 600, marginBottom: 8 }}>
            Código válido! Escolha como pagar:
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {links.mensal && (
              <a
                href={links.mensal}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: "1 1 160px",
                  textAlign: "center",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#1B2A4E",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Plano mensal com desconto →
              </a>
            )}
            {links.anual && (
              <a
                href={links.anual}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: "1 1 160px",
                  textAlign: "center",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#FF7A45",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Plano anual com desconto →
              </a>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#6B7691", margin: "10px 0 0" }}>
            Você vai para o Mercado Pago. Ao concluir o pagamento, seu plano é ativado automaticamente.
          </p>
        </div>
      )}
    </section>
  );
}
