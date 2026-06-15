import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/usuarios")({ component: UsersPage });

type Row = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  telefone: string | null;
  created_at: string;
  plano: string;
  ciclo: string | null;
  status: string;
  current_period_end: string | null;
  last_seen: string | null;
  events_month: number;
};

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"pro"|"free"|"active"|"inactive">("all");
  const [drawer, setDrawer] = useState<Row | null>(null);
  const [sortKey, setSortKey] = useState<"plano"|"last_seen"|"events_month"|null>(null);
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const toggleSort = (key: "plano"|"last_seen"|"events_month") => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  useEffect(() => {
    (async () => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [profilesQ, subsQ, evQ] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,email,telefone,created_at"),
        supabase.from("subscriptions").select("user_id,plano,ciclo,status,current_period_end"),
        supabase.from("activity_events").select("user_id,created_at").gte("created_at", monthStart),
      ]);
      const subsMap = new Map((subsQ.data ?? []).map(s => [s.user_id, s]));
      const lastMap = new Map<string, string>();
      const cntMap = new Map<string, number>();
      (evQ.data ?? []).forEach(e => {
        if (!e.user_id) return;
        cntMap.set(e.user_id, (cntMap.get(e.user_id) ?? 0) + 1);
        const prev = lastMap.get(e.user_id);
        if (!prev || prev < e.created_at) lastMap.set(e.user_id, e.created_at);
      });
      const out: Row[] = (profilesQ.data ?? []).map(p => {
        const sub = subsMap.get(p.user_id);
        return {
          user_id: p.user_id,
          display_name: p.display_name, email: p.email, telefone: p.telefone,
          created_at: p.created_at,
          plano: sub?.plano ?? "free", ciclo: sub?.ciclo ?? null, status: sub?.status ?? "active",
          current_period_end: sub?.current_period_end ?? null,
          last_seen: lastMap.get(p.user_id) ?? null,
          events_month: cntMap.get(p.user_id) ?? 0,
        };
      });
      setRows(out);
    })();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const base = rows.filter(r => {
      if (ql && !(r.display_name?.toLowerCase().includes(ql) || r.email?.toLowerCase().includes(ql))) return false;
      if (filter === "pro" && r.plano !== "pro") return false;
      if (filter === "free" && r.plano !== "free") return false;
      if (filter === "active" && !r.last_seen) return false;
      if (filter === "inactive" && r.last_seen) return false;
      return true;
    });
    if (!sortKey) return base;
    const planoRank = (r: Row) => r.plano === "pro" ? (r.ciclo === "anual" ? 3 : r.ciclo === "cortesia" ? 2 : 1) : 0;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortKey === "plano") { va = planoRank(a); vb = planoRank(b); }
      else if (sortKey === "last_seen") { va = a.last_seen ? Date.parse(a.last_seen) : 0; vb = b.last_seen ? Date.parse(b.last_seen) : 0; }
      else if (sortKey === "events_month") { va = a.events_month; vb = b.events_month; }
      return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
    });
  }, [rows, q, filter, sortKey, sortDir]);

  const arrow = (key: "plano"|"last_seen"|"events_month") =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : " ⇅";

  return (
    <AdminLayout title="Usuários" subtitle={`${rows.length} cadastrados — ${filtered.length} exibidos`}>
      <div className="ad-card" style={{marginBottom:14}}>
        <div className="ad-row">
          <div className="ad-field" style={{flex:1,minWidth:240}}>
            <label>Buscar</label>
            <input className="ad-input" placeholder="nome ou e-mail" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="ad-field">
            <label>Filtro</label>
            <select className="ad-select" value={filter} onChange={e => setFilter(e.target.value as never)}>
              <option value="all">Todos</option>
              <option value="pro">Apenas Pro</option>
              <option value="free">Apenas Free</option>
              <option value="active">Ativos no mês</option>
              <option value="inactive">Sem acesso recente</option>
            </select>
          </div>
        </div>
      </div>
      <div className="ad-card" style={{padding:0,overflow:"hidden"}}>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr>
              <th>Nome</th><th>E-mail</th><th>Telefone</th>
              <th>
                <button type="button" onClick={() => toggleSort("plano")}
                  style={{background:"transparent",border:0,padding:0,font:"inherit",color:"inherit",cursor:"pointer",fontWeight:700}}>
                  Plano{arrow("plano")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("last_seen")}
                  style={{background:"transparent",border:0,padding:0,font:"inherit",color:"inherit",cursor:"pointer",fontWeight:700}}>
                  Último acesso{arrow("last_seen")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("events_month")}
                  style={{background:"transparent",border:0,padding:0,font:"inherit",color:"inherit",cursor:"pointer",fontWeight:700}}>
                  Eventos (mês){arrow("events_month")}
                </button>
              </th>
              <th></th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.user_id}>
                  <td style={{fontWeight:600}}>{r.display_name ?? "—"}</td>
                  <td>{r.email ?? "—"}</td>
                  <td>{r.telefone ?? "—"}</td>
                  <td>
                    <span className={"ad-badge " + (r.plano === "pro" ? "pro" : "free")}>
                      {r.plano === "pro" ? `PRO · ${r.ciclo ?? ""}` : "FREE"}
                    </span>
                  </td>
                  <td>{r.last_seen ? new Date(r.last_seen).toLocaleString("pt-BR") : <span style={{color:"#9CA3AF"}}>nunca</span>}</td>
                  <td>{r.events_month}</td>
                  <td><button className="ad-btn ghost" onClick={() => setDrawer(r)}>Ver</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{textAlign:"center",padding:40,color:"#6B7280"}}>Nenhum resultado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {drawer && <UserDrawer row={drawer} onClose={() => setDrawer(null)} />}
    </AdminLayout>
  );
}

function UserDrawer({ row, onClose }: { row: Row; onClose: () => void }) {
  const [events, setEvents] = useState<Array<{ event_type: string; route: string | null; created_at: string }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("activity_events")
        .select("event_type,route,created_at")
        .eq("user_id", row.user_id)
        .order("created_at", { ascending: false }).limit(50);
      setEvents(data ?? []);
    })();
  }, [row.user_id]);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,27,54,.55)",zIndex:90,display:"flex",justifyContent:"flex-end"}}>
      <div onClick={e => e.stopPropagation()} style={{width:"min(540px,92vw)",background:"#fff",height:"100%",overflow:"auto",padding:24,fontFamily:"'Inter',sans-serif"}}>
        <button onClick={onClose} style={{float:"right",background:"transparent",border:0,fontSize:22,cursor:"pointer",color:"#6B7280"}}>×</button>
        <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:800,fontSize:22,color:"#0F1B36",margin:0}}>{row.display_name ?? row.email}</h2>
        <p style={{color:"#6B7280",fontSize:13,marginTop:4}}>{row.email}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"18px 0"}}>
          <Info k="Plano" v={row.plano.toUpperCase() + (row.ciclo ? ` · ${row.ciclo}` : "")} />
          <Info k="Status" v={row.status} />
          <Info k="Telefone" v={row.telefone ?? "—"} />
          <Info k="Cadastro" v={new Date(row.created_at).toLocaleDateString("pt-BR")} />
          <Info k="Validade" v={row.current_period_end ? new Date(row.current_period_end).toLocaleDateString("pt-BR") : "—"} />
          <Info k="Último acesso" v={row.last_seen ? new Date(row.last_seen).toLocaleString("pt-BR") : "nunca"} />
        </div>
        <h3 style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"#0F1B36",margin:"18px 0 8px"}}>Atividades recentes</h3>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {events.map((e,i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"#F4F6FB",borderRadius:7,fontSize:12}}>
              <span style={{fontWeight:600,color:"#0F1B36"}}>{e.event_type}</span>
              <span style={{color:"#6B7280"}}>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {events.length === 0 && <p style={{color:"#9CA3AF",fontSize:13}}>Sem atividades registradas.</p>}
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return <div style={{background:"#F4F6FB",padding:"9px 11px",borderRadius:8}}>
    <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em"}}>{k}</div>
    <div style={{fontSize:13,fontWeight:600,color:"#0F1B36",marginTop:3}}>{v}</div>
  </div>;
}