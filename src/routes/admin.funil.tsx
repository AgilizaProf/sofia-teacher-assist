import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/funil")({ component: FunilPage });

type Etapa = { label: string; users: number; pct: number; conv: number };

function FunilPage() {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(30);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const since = new Date(Date.now() - periodo * 864e5).toISOString();

      const eventos = [
        { ev: "auth_signup",           label: "1. Cadastrou" },
        { ev: "auth_login",            label: "2. Logou novamente" },
        { ev: "turma_criada",          label: "3. Criou 1ª turma" },
        { ev: "plano_aula_gerado",     label: "4. Gerou 1º documento ✨" },
        { ev: "documento_exportado",   label: "5. Exportou (PDF/Word)" },
        { ev: "upgrade_click",         label: "6. Considerou upgrade" },
      ];

      const out: Etapa[] = [];
      let baseline = 0;
      let anterior = 0;

      for (const { ev, label } of eventos) {
        const { data } = await supabase
          .from("activity_events")
          .select("user_id")
          .eq("event_type", ev)
          .gte("created_at", since);
        const uniq = new Set((data ?? []).map((r) => r.user_id)).size;
        if (baseline === 0) baseline = uniq;
        const conv = anterior > 0 ? (uniq / anterior) * 100 : 100;
        out.push({ label, users: uniq, pct: baseline ? (uniq / baseline) * 100 : 0, conv });
        anterior = uniq || 1;
      }
      setEtapas(out);
      setLoading(false);
    })();
  }, [periodo]);

  return (
    <AdminLayout title="Funil de ativação" subtitle="Onde as professoras travam no caminho para o valor">
      <div className="ad-card" style={{ marginBottom: 14 }}>
        <div className="ad-row">
          <div className="ad-field">
            <label>Período</label>
            <select className="ad-select" value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
              <option value={1}>Últimas 24 horas</option>
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ad-card">Carregando…</div>
      ) : (
        <div className="ad-card">
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 18 }}>
            Cada barra mostra quantos usuários únicos chegaram a cada etapa.
            A "conversão da etapa" mostra a % que avançou da etapa anterior para esta.
          </p>
          {etapas.map((e, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span style={{ color: "#0F1B36" }}>{e.label}</span>
                <span style={{ display: "flex", gap: 12, color: "#6B7280" }}>
                  {i > 0 && (
                    <span style={{ color: e.conv >= 50 ? "#16A34A" : e.conv >= 20 ? "#D97706" : "#DC2626", fontWeight: 700 }}>
                      {e.conv.toFixed(0)}% da etapa anterior
                    </span>
                  )}
                  <span style={{ color: "#0F1B36", fontWeight: 700 }}>{e.users} usuários</span>
                </span>
              </div>
              <div className="ad-bar">
                <div style={{ width: `${e.pct}%` }} />
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                {e.pct.toFixed(1)}% dos cadastros chegaram aqui
              </div>
            </div>
          ))}

          {etapas.length > 1 && (
            <div style={{ marginTop: 24, padding: "14px 16px", background: "#FFF7ED", borderRadius: 10, border: "1px solid #FED7AA" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#9A3412", marginBottom: 8 }}>💡 Maior gargalo</div>
              {(() => {
                let minConv = 101; let minLabel = "";
                etapas.forEach((e, i) => { if (i > 0 && e.conv < minConv) { minConv = e.conv; minLabel = e.label; } });
                return (
                  <p style={{ fontSize: 13, color: "#7C2D12" }}>
                    <strong>{minLabel}</strong> — apenas <strong>{minConv.toFixed(0)}%</strong> das professoras chegam aqui.
                    É onde mais vale investir em melhoria de UX ou onboarding.
                  </p>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
