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
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max = Math.max(1, ...top.map(([,v]) => v));

  return (
    <AdminLayout title="Atividades" subtitle="Stream em tempo real das ações dos usuários">
      <div className="ad-card">
        <h3>Funções mais usadas pelos usuários</h3>
        {top.length === 0 ? (
          <p style={{fontSize:13,color:"#6B7280"}}>Sem dados ainda.</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
            {top.map(([k,v]) => (
              <div key={k}>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Inter',sans-serif",fontSize:12,marginBottom:4}}>
                  <span style={{fontWeight:600,color:"#0F1B36"}}>{k}</span>
                  <span style={{color:"#6B7280",fontWeight:700}}>{v}</span>
                </div>
                <div className="ad-bar"><div style={{width:`${(v/max)*100}%`}}/></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}