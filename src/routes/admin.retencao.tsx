import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/retencao")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: RetencaoPage,
});

type Cohort = {
  semana: string; // "2025-W01"
  cadastros: number;
  voltou_s1: number;
  voltou_s2: number;
  voltou_s3: number;
  voltou_s4: number;
};

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, "0")}`;
}

function addWeeks(isoW: string, n: number): string {
  const [year, wStr] = isoW.split("-S");
  const week = parseInt(wStr) + n;
  // Aproximação: recalcular a partir de Jan 4 (sempre na semana 1)
  const jan4 = new Date(Date.UTC(parseInt(year), 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const weekStart = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000 + (week - 1) * 7 * 86400000);
  return isoWeek(weekStart);
}

function RetencaoPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90); // últimas 13 semanas

      const [profilesQ, eventsQ] = await Promise.all([
        supabase.from("profiles").select("user_id, created_at").gte("created_at", cutoff.toISOString()),
        supabase.from("activity_events").select("user_id, created_at").gte("created_at", cutoff.toISOString()),
      ]);

      const profiles = profilesQ.data ?? [];
      const events = eventsQ.data ?? [];

      // Mapa: user_id → Set de semanas em que teve atividade
      const activityWeeks = new Map<string, Set<string>>();
      for (const e of events) {
        if (!e.user_id) continue;
        const w = isoWeek(new Date(e.created_at));
        if (!activityWeeks.has(e.user_id)) activityWeeks.set(e.user_id, new Set());
        activityWeeks.get(e.user_id)!.add(w);
      }

      // Agrupar cadastros por semana
      const cohortMap = new Map<string, string[]>();
      for (const p of profiles) {
        const w = isoWeek(new Date(p.created_at));
        if (!cohortMap.has(w)) cohortMap.set(w, []);
        cohortMap.get(w)!.push(p.user_id);
      }

      const result: Cohort[] = Array.from(cohortMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12) // últimas 12 semanas
        .map(([semana, users]) => {
          const check = (offset: number) =>
            users.filter((uid) => activityWeeks.get(uid)?.has(addWeeks(semana, offset))).length;
          return {
            semana,
            cadastros: users.length,
            voltou_s1: check(1),
            voltou_s2: check(2),
            voltou_s3: check(3),
            voltou_s4: check(4),
          };
        });

      setCohorts(result.reverse()); // mais recente primeiro
      setLoading(false);
    })();
  }, []);

  const pct = (n: number, total: number) =>
    total === 0 ? "—" : `${Math.round((n / total) * 100)}%`;

  const color = (n: number, total: number) => {
    if (total === 0) return "#6B7280";
    const p = n / total;
    if (p >= 0.5) return "#166534";
    if (p >= 0.3) return "#92400E";
    return "#991B1B";
  };

  const avgRetS1 = cohorts.length
    ? Math.round(cohorts.reduce((s, c) => s + (c.cadastros ? c.voltou_s1 / c.cadastros : 0), 0) / cohorts.length * 100)
    : 0;

  return (
    <AdminLayout title="Retenção" subtitle="Cohort semanal — quantos voltaram após o cadastro">
      <div className="ad-stat-grid" style={{ marginBottom: 18 }}>
        <div className="ad-stat">
          <div className="ad-stat-label">Cohorts analisados</div>
          <div className="ad-stat-val">{cohorts.length}</div>
          <div className="ad-stat-hint">últimas 12 semanas</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Retenção média S+1</div>
          <div className={`ad-stat-val ${avgRetS1 >= 40 ? "ad-stat-accent" : ""}`}>{avgRetS1}%</div>
          <div className="ad-stat-hint">voltou na semana seguinte</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Total de cadastros</div>
          <div className="ad-stat-val">{cohorts.reduce((s, c) => s + c.cadastros, 0)}</div>
          <div className="ad-stat-hint">no período analisado</div>
        </div>
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}>
          <h3 style={{ margin: 0 }}>Tabela de cohorts</h3>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Semana cadastro</th>
                <th>Cadastros</th>
                <th>Voltou S+1</th>
                <th>Voltou S+2</th>
                <th>Voltou S+3</th>
                <th>Voltou S+4</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Carregando…</td></tr>
              )}
              {!loading && cohorts.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Sem dados suficientes.</td></tr>
              )}
              {cohorts.map((c) => (
                <tr key={c.semana}>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700 }}>{c.semana}</td>
                  <td style={{ fontWeight: 700 }}>{c.cadastros}</td>
                  {[
                    { n: c.voltou_s1, label: "S+1" },
                    { n: c.voltou_s2, label: "S+2" },
                    { n: c.voltou_s3, label: "S+3" },
                    { n: c.voltou_s4, label: "S+4" },
                  ].map(({ n, label }) => (
                    <td key={label}>
                      <span style={{ fontWeight: 700, color: color(n, c.cadastros) }}>
                        {n}
                      </span>
                      <span style={{ fontSize: 11, color: "#6B7280", marginLeft: 6 }}>
                        ({pct(n, c.cadastros)})
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ad-card" style={{ marginTop: 18, fontSize: 12, color: "#6B7280" }}>
        <strong>Como ler:</strong> cada linha é um grupo (cohort) de usuários que se cadastraram naquela semana.
        As colunas S+1, S+2, S+3, S+4 mostram quantos desse grupo tiveram pelo menos uma ação nas semanas seguintes ao cadastro.
        Percentual em parênteses é em relação ao total de cadastros da cohort.
      </div>
    </AdminLayout>
  );
}
