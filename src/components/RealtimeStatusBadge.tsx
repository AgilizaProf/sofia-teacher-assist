import { useRealtimeStatus } from "@/hooks/useRealtimeSync";

/**
 * Pequeno indicador (ponto + texto) que mostra se a sincronização em
 * tempo real entre dispositivos está ativa, conectando ou em fallback
 * (apenas atualiza ao focar a aba / recarregar).
 */
export function RealtimeStatusBadge({ compact = false }: { compact?: boolean }) {
  const status = useRealtimeStatus();
  const meta =
    status === "live"
      ? { dot: "#22c55e", label: "Sincronizado", title: "Sincronização em tempo real ativa entre seus dispositivos." }
      : status === "connecting"
      ? { dot: "#eab308", label: "Conectando…", title: "Estabelecendo conexão de sincronização em tempo real." }
      : { dot: "#ef4444", label: "Modo offline", title: "Sincronização em tempo real indisponível — os dados serão atualizados ao voltar para a aba." };

  return (
    <span
      title={meta.title}
      aria-label={meta.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: "rgba(255,255,255,0.85)",
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.18)",
        padding: "3px 8px",
        borderRadius: 999,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: meta.dot,
          boxShadow: status === "live" ? `0 0 0 0 ${meta.dot}66` : "none",
          animation: status === "live" ? "rtsync-pulse 1.8s ease-out infinite" : status === "connecting" ? "rtsync-blink 1s ease-in-out infinite" : "none",
        }}
      />
      {!compact && <span>{meta.label}</span>}
      <style>{`
        @keyframes rtsync-pulse { 0% { box-shadow: 0 0 0 0 ${meta.dot}66; } 70% { box-shadow: 0 0 0 6px ${meta.dot}00; } 100% { box-shadow: 0 0 0 0 ${meta.dot}00; } }
        @keyframes rtsync-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </span>
  );
}