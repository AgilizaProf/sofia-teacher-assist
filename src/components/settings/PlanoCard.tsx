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
  const [showCancel, setShowCancel] = useState(false);
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

  const handleCancelConfirm = async (reasons: string[], comment: string) => {
    setBusy(true);
    try {
      await cancel({ data: { reasons, comment: comment.trim() || undefined } });
      toast.success("Assinatura cancelada. Você mantém o Pro até o fim do período.");
      setShowCancel(false);
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
        <PlanoBody data={data} busy={busy} onCancel={() => setShowCancel(true)} />
      )}
      {showCancel && (
        <CancelModal
          busy={busy}
          onClose={() => !busy && setShowCancel(false)}
          onConfirm={handleCancelConfirm}
        />
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

  // Resumo (3 campos)
  const planoNome = isPro ? "Pro" : "Free";
  const cicloNome = isPro
    ? data.source === "admin_grant"
      ? "Cortesia"
      : data.ciclo === "anual"
      ? "Anual"
      : data.ciclo === "mensal"
      ? "Mensal"
      : "—"
    : "Semanal (gratuito)";
  const terminoLabel = isMpActive
    ? "Próxima renovação"
    : isMpCanceled
    ? "Acesso até"
    : isAdminGrant
    ? "Cortesia até"
    : "—";
  const terminoData = data.current_period_end ? fmtData(data.current_period_end) : "—";

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
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <ResumoItem label="Plano atual" value={planoNome} />
        <ResumoItem label="Ciclo" value={cicloNome} />
        <ResumoItem label={terminoLabel} value={terminoData} />
      </div>

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
            Assinar mensal — R$ 34,90/mês
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
              : "Assinar anual — R$ 247/ano"}
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

function ResumoItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "12px 14px",
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{value}</div>
    </div>
  );
}

const CANCEL_REASONS = [
  "Preço acima do que posso pagar",
  "Não estou usando o suficiente",
  "Faltam funcionalidades que preciso",
  "Encontrei outra ferramenta",
  "Tive problemas técnicos",
  "Foi apenas para testar",
  "Outro motivo",
];

function CancelModal({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (reasons: string[], comment: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const toggle = (r: string) =>
    setSelected((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "0 20px 50px rgba(15,23,42,.25)",
        }}
      >
        <h3
          id="cancel-title"
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            color: NAVY,
          }}
        >
          Tem certeza que deseja cancelar?
        </h3>
        <p style={{ color: MUTED, fontSize: 13, margin: "8px 0 18px", lineHeight: 1.5 }}>
          Você continuará com o Pro até o fim do período já pago. Antes de confirmar, conte o
          motivo — sua resposta nos ajuda a melhorar.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8, letterSpacing: ".03em", textTransform: "uppercase" }}>
            Por que está cancelando? (pode marcar mais de um)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CANCEL_REASONS.map((r) => {
              const checked = selected.includes(r);
              return (
                <label
                  key={r}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: `1px solid ${checked ? ACCENT : BORDER}`,
                    background: checked ? "#FFF6F0" : "#fff",
                    borderRadius: 10,
                    fontSize: 13,
                    color: NAVY,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r)}
                    style={{ accentColor: ACCENT }}
                  />
                  <span>{r}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="cancel-comment"
            style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8, display: "block", letterSpacing: ".03em", textTransform: "uppercase" }}
          >
            Quer contar mais? (opcional)
          </label>
          <textarea
            id="cancel-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 2000))}
            placeholder="O que faltou ou o que poderíamos melhorar?"
            rows={4}
            maxLength={2000}
            style={{
              width: "100%",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "inherit",
              color: NAVY,
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{ ...cta("ghost"), opacity: busy ? 0.6 : 1 }}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected, comment)}
            disabled={busy}
            style={{ ...cta("danger"), opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Cancelando…" : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
