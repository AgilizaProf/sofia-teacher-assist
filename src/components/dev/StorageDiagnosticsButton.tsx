import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  downloadStorageIssues,
  getStorageIssues,
} from "@/lib/persist/storageDiagnostics";

/**
 * Botão flutuante (canto inferior esquerdo) que aparece automaticamente
 * sempre que o buffer de diagnóstico de storage tiver pelo menos 1 item.
 * Clique → baixa um JSON com todas as ocorrências para compartilhar.
 */
export function StorageDiagnosticsButton() {
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setCount(getStorageIssues().length);
    refresh();
    // Pesquisa leve a cada 2s — o buffer é in-memory, não há evento dedicado.
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, []);

  if (count === 0) return null;

  const handleClick = () => {
    const filename = downloadStorageIssues();
    setFeedback(filename ? `Baixado: ${filename}` : "Falha ao exportar");
    window.setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        title="Baixar diagnóstico de storage como JSON"
        aria-label={`Baixar diagnóstico de storage (${count} ocorrências)`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid rgba(249,115,22,.4)",
          background: "linear-gradient(135deg,#1F1B2E,#2A1F3D)",
          color: "#FDBA74",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        }}
      >
        <Download size={14} strokeWidth={2.4} />
        Diagnóstico ({count})
      </button>
      {feedback && (
        <div
          role="status"
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(15,13,30,.92)",
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

export default StorageDiagnosticsButton;