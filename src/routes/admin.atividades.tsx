import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/atividades")({ component: ActPage });

type Ev = { id: string; user_id: string | null; event_type: string; route: string | null; created_at: string };

function ActPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("activity_events").select("id,user_id,event_type,route,created_at").order("created_at",{ascending:false}).limit(150);
      setEvents((data ?? []) as Ev[]);
      const ids = Array.from(new Set((data ?? []).map(e=>e.user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("user_id,email,display_name").in("user_id", ids);
        const m: Record<string,string> = {};
        (ps ?? []).forEach(p => { m[p.user_id] = p.display_name ?? p.email ?? p.user_id.slice(0,8); });
        setEmails(m);
      }
    };
    load();
    const ch = supabase.channel("act-watch").on("postgres_changes",{event:"INSERT",schema:"public",table:"activity_events"}, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.event_type] = (counts[e.event_type] ?? 0) + 1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <AdminLayout title="Atividades" subtitle="Stream em tempo real das ações dos usuários">
      <div className="ad-stat-grid" style={{marginBottom:18}}>
        {top.map(([k,v]) => <div key={k} className="ad-stat"><div className="ad-stat-label">{k}</div><div className="ad-stat-val">{v}</div></div>)}
      </div>
      <div className="ad-card" style={{padding:0,overflow:"hidden"}}>
        <table className="ad-table">
          <thead><tr><th>Quando</th><th>Usuário</th><th>Evento</th><th>Rota</th></tr></thead>
          <tbody>{events.map(e => (
            <tr key={e.id}>
              <td>{new Date(e.created_at).toLocaleString("pt-BR")}</td>
              <td>{e.user_id ? (emails[e.user_id] ?? e.user_id.slice(0,8)) : "anônimo"}</td>
              <td><span className="ad-badge ok">{e.event_type}</span></td>
              <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#6B7280"}}>{e.route ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminLayout>
  );
}