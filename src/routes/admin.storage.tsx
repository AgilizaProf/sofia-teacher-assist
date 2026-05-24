import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/storage")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: StoragePage,
});

const fmtBytes = (b: number) => {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
};

type BucketStat = {
  bucket: string;
  arquivos: number;
  bytes: number;
  usuarios: number;
};

function StoragePage() {
  const [buckets, setBuckets] = useState<BucketStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabase free tier: 1 GB storage total
  const LIMIT_BYTES = 1_073_741_824;

  useEffect(() => {
    (async () => {
      setLoading(true);
      // curriculos-municipais — dados do banco (arquivo_bytes)
      const { data: curriculos } = await (supabase as any)
        .from("user_curriculo_municipal")
        .select("user_id, arquivo_bytes");

      const totalCurriculo = (curriculos ?? []).reduce((s: number, r: any) => s + (r.arquivo_bytes ?? 0), 0);
      const usuariosCurriculo = new Set((curriculos ?? []).map((r: any) => r.user_id)).size;

      setBuckets([
        {
          bucket: "documentos-professor",
          arquivos: (curriculos ?? []).length,
          bytes: totalCurriculo,
          usuarios: usuariosCurriculo,
        },
      ]);
      setLoading(false);
    })();
  }, []);

  const totalBytes = buckets.reduce((s, b) => s + b.bytes, 0);
  const pctTotal = Math.min(100, (totalBytes / LIMIT_BYTES) * 100);

  return (
    <AdminLayout title="Storage" subtitle="Uso de armazenamento por bucket">
      <div className="ad-stat-grid" style={{ marginBottom: 18 }}>
        <div className="ad-stat">
          <div className="ad-stat-label">Total usado</div>
          <div className="ad-stat-val">{fmtBytes(totalBytes)}</div>
          <div className="ad-stat-hint">de 1 GB (plano free)</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">% do limite</div>
          <div className={`ad-stat-val ${pctTotal >= 80 ? "ad-stat-accent" : ""}`}>
            {pctTotal.toFixed(2)}%
          </div>
          <div className="ad-stat-hint">{fmtBytes(LIMIT_BYTES - totalBytes)} restantes</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Buckets ativos</div>
          <div className="ad-stat-val">{buckets.length}</div>
          <div className="ad-stat-hint">rastreados</div>
        </div>
      </div>

      <div className="ad-card" style={{ marginBottom: 18 }}>
        <h3>Uso total</h3>
        <div className="ad-bar" style={{ height: 16, borderRadius: 8 }}>
          <div style={{ width: `${pctTotal.toFixed(2)}%`, background: pctTotal >= 80 ? "#DC2626" : pctTotal >= 60 ? "#F59E0B" : undefined }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginTop: 6 }}>
          <span>{fmtBytes(totalBytes)} usado</span>
          <span>{fmtBytes(LIMIT_BYTES)} limite</span>
        </div>
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}>
          <h3 style={{ margin: 0 }}>Detalhamento por bucket</h3>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Bucket</th>
                <th>Arquivos</th>
                <th>Usuários</th>
                <th>Tamanho total</th>
                <th>Média por arquivo</th>
                <th style={{ width: 200 }}>% do limite</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Carregando…</td></tr>
              )}
              {!loading && buckets.map((b) => {
                const pct = Math.min(100, (b.bytes / LIMIT_BYTES) * 100);
                const avg = b.arquivos ? b.bytes / b.arquivos : 0;
                return (
                  <tr key={b.bucket}>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{b.bucket}</td>
                    <td>{b.arquivos}</td>
                    <td>{b.usuarios}</td>
                    <td style={{ fontWeight: 700 }}>{fmtBytes(b.bytes)}</td>
                    <td>{fmtBytes(avg)}</td>
                    <td>
                      <div className="ad-bar">
                        <div style={{ width: `${pct.toFixed(2)}%`, background: pct >= 80 ? "#DC2626" : pct >= 60 ? "#F59E0B" : undefined }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{pct.toFixed(3)}%</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
