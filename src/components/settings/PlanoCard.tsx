import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getPlanoAtual,
  cancelarAssinatura,
  type PlanoAtualDTO,
} from "@/lib/plano.functions";

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const NAVY = "#1B2A4E";
const MUTED = "#6B7691";
const BORDER = "#E4E8F0";
const ACCENT = "#FF7A45";
const SUCCESS = "#10B981";
const DANGER = "#DC2626";

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 24,
  marginBottom: 18,
};

const cta = (variant: "primary" | "ghost" | "danger"): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  border:
    variant === "ghost"
      ? `1px solid ${BORDER}`
      : variant === "danger"
      ? `1px solid ${DANGER}`
      : "none",
  background:
    variant === "primary"
      ? `linear-gradient(135deg, ${ACCENT}, #FF9466)`
      : variant === "danger"
      ? "#fff"
      : "#fff",
  color: variant === "primary" ? "#fff" : variant === "danger" ? DANGER : NAVY,
  boxShadow: variant === "primary" ? "0 6px 16px rgba(255,122,69,.28)" : "none",
  textDecoration: "none",
});

const pill = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: bg,
  color: fg,
  fontSize: 11,
  fontWeight: 800,
  padding: "3px 9px",
  borderRadius: 100,
  letterSpacing: ".04em",
  textTransform: "uppercase",
});

export function PlanoCard() {
  const [data, setData] = useState<PlanoAtualDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fetchPlano = useServerFn(getPlanoAtual);
  const cancel = useServerFn(cancelarAssinatura);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetchPlano();
      setData(r);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar seu plano.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!confirm("Cancelar assinatura? Você continuará no Pro até o fim do período pago.")) return;
    setBusy(true);
    try {
      await cancel({ data: {} });
      toast.success("Assinatura cancelada. Você mantém o Pro até o fim do período.");
      await reload();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível cancelar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={sectionStyle} aria-labelledby="plano-title">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h2
          id="plano-title"
          style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, margin: 0 }}
        >
          💳 Meu plano
        </h2>
      </div>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 18px" }}>
        Assine, troque de ciclo ou cancele a qualquer momento. Pagamento processado pelo Mercado Pago.
      </p>

      {loading || !data ? (
        <div style={{ color: MUTED, fontSize: 13 }}>Carregando…</div>
      ) : (
        <PlanoBody data={data} busy={busy} onCancel={handleCancel} />
      )}
    </section>
  );
}

function PlanoBody({
  data,
  busy,
  onCancel,
}: {
  data: PlanoAtualDTO;
  busy: boolean;
  onCancel: () => void;
}) {
  const isPro = data.plano === "pro";
  const isMpActive = isPro && data.source === "mercadopago" && data.status === "active";
  const isMpCanceled =
    isPro && data.source === "mercadopago" && data.status !== "active";
  const isAdminGrant = isPro && data.source === "admin_grant";

  // Banner de status
  let label = "Plano Free";
  let labelStyle = pill("#F1F5F9", "#475569");
  let descricao = "Acesso gratuito com créditos semanais.";

  if (isMpActive) {
    label = `Plano Pro · ${data.ciclo === "anual" ? "Anual" : "Mensal"}`;
    labelStyle = pill("#DCFCE7", "#047857");
    descricao = data.current_period_end
      ? `Próxima renovação em ${fmtData(data.current_period_end)}.`
      : "Assinatura ativa.";
  } else if (isMpCanceled) {
    label = `Pro · ${data.ciclo === "anual" ? "Anual" : "Mensal"} (cancelado)`;
    labelStyle = pill("#FEF3C7", "#92400E");
    descricao = data.current_period_end
      ? `Você mantém o Pro até ${fmtData(data.current_period_end)}. Depois disso, volta para o Free.`
      : "Assinatura cancelada.";
  } else if (isAdminGrant) {
    label = "Pro · Cortesia";
    labelStyle = pill("#FFF1E8", "#9A3412");
    descricao = data.current_period_end
      ? `Acesso válido até ${fmtData(data.current_period_end)}.`
      : "Acesso de cortesia ativo.";
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "#FBFAF6",
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <span style={labelStyle}>{label}</span>
        <span style={{ color: MUTED, fontSize: 13, flex: 1, minWidth: 200 }}>
          {descricao}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {/* Free → assinar */}
        {data.pode_assinar_mensal && (
          <a
            href={data.checkout_mensal}
            target="_blank"
            rel="noopener noreferrer"
            style={cta(data.ciclo === "anual" && isMpActive ? "ghost" : "primary")}
          >
            Assinar mensal — R$ 27/mês
          </a>
        )}
        {data.pode_assinar_anual && (
          <a
            href={data.checkout_anual}
            target="_blank"
            rel="noopener noreferrer"
            style={cta("primary")}
          >
            {data.pode_migrar_anual
              ? "Migrar para anual (mantém dias restantes)"
              : "Assinar anual — R$ 270/ano"}
          </a>
        )}

        {/* Cancelar */}
        {data.pode_cancelar && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{ ...cta("danger"), opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Cancelando…" : "Cancelar assinatura"}
          </button>
        )}
      </div>

      {data.pode_migrar_anual && (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
          Ao migrar para o anual, a cobrança mensal é encerrada automaticamente no Mercado Pago e
          os dias que restam do seu período mensal são somados aos 365 dias do anual.
        </p>
      )}
      {isMpCanceled && (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
          Você pode reassinar a qualquer momento — basta escolher mensal ou anual acima.
        </p>
      )}
    </div>
  );
}
