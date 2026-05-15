import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/infra")({ component: InfraPage });

const TABLES = ["profiles","subscriptions","activity_events","platform_errors","page_visits","turmas","alunos_inclusao","pareceres","pei_pdi","planos_aula","trilhas","agenda_eventos"] as const;

function InfraPage() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const t0 = performance.now();
      const out: Record<string, number | null> = {};
      await Promise.all(TABLES.map(async t => {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        out[t] = count ?? 0;
      }));
      setCounts(out);
      setLatency(Math.round(performance.now() - t0));
    })();
  }, []);

  return (
    <AdminLayout title="Monitor de infraestrutura" subtitle="Saúde do backend">
      <div className="ad-stat-grid" style={{marginBottom:18}}>
        <div className="ad-stat"><div className="ad-stat-label">Latência total</div><div className="ad-stat-val">{latency ?? "…"}<span style={{fontSize:14,color:"#6B7280"}}> ms</span></div><div className="ad-stat-hint">{TABLES.length} consultas paralelas</div></div>
        <div className="ad-stat"><div className="ad-stat-label">Status</div><div className="ad-stat-val ad-stat-accent">Online</div><div className="ad-stat-hint">AgilizaProf Cloud</div></div>
      </div>
      <div className="ad-card" style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #E5E9F2"}}><h3 style={{margin:0}}>Tabelas — contagem de linhas</h3></div>
        <table className="ad-table">
          <thead><tr><th>Tabela</th><th>Linhas</th></tr></thead>
          <tbody>{TABLES.map(t => <tr key={t}><td style={{fontFamily:"'JetBrains Mono',monospace"}}>{t}</td><td style={{fontWeight:700}}>{counts[t] ?? "…"}</td></tr>)}</tbody>
        </table>
      </div>
    </AdminLayout>
  );
}