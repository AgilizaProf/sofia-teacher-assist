import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ia")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: IaPage,
});

const LIMIT_BRL = 4.2;

type Row = {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  task: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_brl: number;
  month: string;
  created_at: string;
};

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4 });

function IaPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ai_usage")
        .select("*")
        .eq("month", month)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!active) return;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [month]);

  useEffect(() => {
    if (month !== monthKey()) return;
    const ch = supabase
      .channel("admin-ai-usage")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_usage" }, (payload) => {
        const r = payload.new as Row;
        if (r.month !== month) return;
        setRows((prev) => [r, ...prev].slice(0, 5000));
        setPulse((p) => p + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [month]);

  const stats = useMemo(() => {
    const totalBrl = rows.reduce((s, r) => s + Number(r.cost_brl), 0);
    const totalIn = rows.reduce((s, r) => s + r.input_tokens, 0);
    const totalOut = rows.reduce((s, r) => s + r.output_tokens, 0);
    const users = new Set(rows.map((r) => r.user_id));
    const calls = rows.length;
    const avgPerUser = users.size ? totalBrl / users.size : 0;

    const byModel = new Map<string, { provider: string; calls: number; inTok: number; outTok: number; brl: number; users: Set<string> }>();
    for (const r of rows) {
      const k = r.model;
      const e = byModel.get(k) ?? { provider: r.provider, calls: 0, inTok: 0, outTok: 0, brl: 0, users: new Set<string>() };
      e.calls += 1;
      e.inTok += r.input_tokens;
      e.outTok += r.output_tokens;
      e.brl += Number(r.cost_brl);
      e.users.add(r.user_id);
      byModel.set(k, e);
    }
    const models = Array.from(byModel.entries())
      .map(([model, v]) => ({ model, ...v, share: totalBrl ? v.brl / totalBrl : 0, users: v.users.size }))
      .sort((a, b) => b.brl - a.brl);

    const byUser = new Map<string, { calls: number; brl: number }>();
    for (const r of rows) {
      const e = byUser.get(r.user_id) ?? { calls: 0, brl: 0 };
      e.calls += 1; e.brl += Number(r.cost_brl);
      byUser.set(r.user_id, e);
    }
    const topUsers = Array.from(byUser.entries())
      .map(([user_id, v]) => ({ user_id, ...v, pctLimit: v.brl / LIMIT_BRL }))
      .sort((a, b) => b.brl - a.brl)
      .slice(0, 20);

    return { totalBrl, totalIn, totalOut, users: users.size, calls, avgPerUser, models, topUsers };
  }, [rows]);

  const months = useMemo(() => {
    const arr: string[] = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() - 1);
    }
    return arr;
  }, []);

  return (
    <AdminLayout title="Consumo de IA" subtitle={`Tempo real · limite por usuário R$ ${LIMIT_BRL.toFixed(2)}/mês`}>
      <div className="ad-row" style={{ marginBottom: 18 }}>
        <div className="ad-field" style={{ minWidth: 180 }}>
          <label>Mês</label>
          <select className="ad-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ alignSelf: "end", fontSize: 12, color: "#6B7280" }}>
          {month === monthKey() ? <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#16A34A", marginRight: 6, animation: pulse ? "pulse 1s" : undefined }} />ao vivo · {pulse} eventos novos</> : "histórico"}
        </div>
      </div>

      <div className="ad-stat-grid" style={{ marginBottom: 18 }}>
        <div className="ad-stat">
          <div className="ad-stat-label">Gasto total no mês</div>
          <div className="ad-stat-val ad-stat-accent">{fmtBRL(stats.totalBrl)}</div>
          <div className="ad-stat-hint">{stats.calls} chamadas</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Usuários ativos</div>
          <div className="ad-stat-val">{stats.users}</div>
          <div className="ad-stat-hint">com pelo menos 1 chamada</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Média por usuário</div>
          <div className="ad-stat-val">{fmtBRL(stats.avgPerUser)}</div>
          <div className="ad-stat-hint">{((stats.avgPerUser / LIMIT_BRL) * 100).toFixed(1)}% do limite</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Tokens (in / out)</div>
          <div className="ad-stat-val" style={{ fontSize: 20 }}>{stats.totalIn.toLocaleString("pt-BR")} / {stats.totalOut.toLocaleString("pt-BR")}</div>
          <div className="ad-stat-hint">consumo agregado</div>
        </div>
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}><h3 style={{ margin: 0 }}>Gasto por modelo de IA</h3></div>
        <table className="ad-table">
          <thead><tr><th>Modelo</th><th>Provider</th><th>Chamadas</th><th>Usuários</th><th>Tokens in</th><th>Tokens out</th><th>Custo</th><th style={{ width: 200 }}>Participação</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Carregando…</td></tr>}
            {!loading && stats.models.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Sem chamadas neste mês.</td></tr>}
            {stats.models.map((m) => (
              <tr key={m.model}>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{m.model}</td>
                <td><span className="ad-badge ok">{m.provider}</span></td>
                <td>{m.calls}</td>
                <td>{m.users}</td>
                <td>{m.inTok.toLocaleString("pt-BR")}</td>
                <td>{m.outTok.toLocaleString("pt-BR")}</td>
                <td style={{ fontWeight: 700 }}>{fmtBRL(m.brl)}</td>
                <td>
                  <div className="ad-bar"><div style={{ width: `${(m.share * 100).toFixed(1)}%` }} /></div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{(m.share * 100).toFixed(1)}%</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}><h3 style={{ margin: 0 }}>Top usuários — gasto no mês</h3></div>
        <table className="ad-table">
          <thead><tr><th>Usuário</th><th>Chamadas</th><th>Custo</th><th style={{ width: 220 }}>% do limite</th></tr></thead>
          <tbody>
            {!loading && stats.topUsers.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Sem dados.</td></tr>}
            {stats.topUsers.map((u) => {
              const pct = Math.min(100, u.pctLimit * 100);
              const color = pct >= 100 ? "err" : pct >= 80 ? "warn" : "ok";
              return (
                <tr key={u.user_id}>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{u.user_id.slice(0, 8)}…{u.user_id.slice(-4)}</td>
                  <td>{u.calls}</td>
                  <td style={{ fontWeight: 700 }}>{fmtBRL(u.brl)}</td>
                  <td>
                    <div className="ad-bar"><div style={{ width: `${pct.toFixed(1)}%`, background: pct >= 100 ? "#DC2626" : pct >= 80 ? "#F59E0B" : undefined }} /></div>
                    <div style={{ fontSize: 11, marginTop: 3 }}><span className={"ad-badge " + color}>{pct.toFixed(1)}%</span></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.6)}100%{transform:scale(1)}}`}</style>
    </AdminLayout>
  );
}
