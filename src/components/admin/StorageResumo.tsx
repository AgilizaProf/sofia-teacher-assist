import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cartão "Arquivos guardados" dentro de Saúde do sistema (antes era a aba
// Storage). Hoje os arquivos enviados são os currículos em PDF.

const LIMITE = 1_073_741_824; // 1 GB do plano gratuito do Supabase

const fmtBytes = (b: number) => {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
};

export function StorageResumo() {
  const [dados, setDados] = useState<{ bytes: number; arquivos: number; pessoas: number } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_curriculo_municipal")
        .select("user_id, arquivo_bytes");
      const linhas = (data ?? []) as { user_id: string; arquivo_bytes: number | null }[];
      setDados({
        bytes: linhas.reduce((s, r) => s + (r.arquivo_bytes ?? 0), 0),
        arquivos: linhas.length,
        pessoas: new Set(linhas.map((r) => r.user_id)).size,
      });
    })();
  }, []);

  const pct = dados ? Math.min(100, (dados.bytes / LIMITE) * 100) : 0;
  const cor = pct >= 80 ? "#DC2626" : pct >= 60 ? "#F59E0B" : undefined;

  return (
    <div className="ad-card" style={{ marginTop: 18 }}>
      <h3>Arquivos guardados</h3>
      {!dados ? (
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Carregando…</p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 18px",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 24 }}>
              {fmtBytes(dados.bytes)}
            </span>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              de 1 GB · {pct.toFixed(2)}% usado · {dados.arquivos} arquivos de {dados.pessoas}{" "}
              pessoas
            </span>
          </div>
          <div className="ad-bar" style={{ height: 12, borderRadius: 6 }}>
            <div style={{ width: `${Math.max(pct, 0.5).toFixed(2)}%`, background: cor }} />
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "8px 0 0" }}>
            São os currículos em PDF que as professoras anexam. Acima de 80% vale aumentar o plano
            de armazenamento.
          </p>
        </>
      )}
    </div>
  );
}
