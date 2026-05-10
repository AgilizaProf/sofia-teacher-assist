import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/erros")({ component: ErrPage });

type E = { id: string; route: string | null; message: string; severity: string; resolved_at: string | null; created_at: string; user_id: string | null };

function ErrPage() {
  const [items, setItems] = useState<E[]>([]);
  const [sev, setSev] = useState<"all"|"info"|"warn"|"error"|"fatal">("all");
  const [showResolved, setShowResolved] = useState(false);

  const load = async () => {
    let q = supabase.from("platform_errors").select("*").order("created_at",{ascending:false}).limit(200);
    if (sev !== "all") q = q.eq("severity", sev);
    if (!showResolved) q = q.is("resolved_at", null);
    const { data } = await q;
    setItems((data ?? []) as E[]);
  };
  useEffect(() => { load(); }, [sev, showResolved]);

  const resolve = async (id: string) => {
    const { error } = await supabase.from("platform_errors").update({ resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marcado como resolvido"); load(); }
  };

  return (
    <AdminLayout title="Erros da plataforma" subtitle={`${items.length} ${showResolved ? "registros" : "abertos"}`}>
      <div className="ad-card" style={{marginBottom:14}}>
        <div className="ad-row">
          <div className="ad-field"><label>Severidade</label>
            <select className="ad-select" value={sev} onChange={e=>setSev(e.target.value as never)}>
              <option value="all">Todas</option><option value="info">Info</option><option value="warn">Aviso</option><option value="error">Erro</option><option value="fatal">Fatal</option>
            </select>
          </div>
          <div className="ad-field"><label>Resolvidos</label>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><input type="checkbox" checked={showResolved} onChange={e=>setShowResolved(e.target.checked)}/> mostrar</label>
          </div>
        </div>
      </div>
      <div className="ad-card" style={{padding:0,overflow:"hidden"}}>
        <table className="ad-table">
          <thead><tr><th>Quando</th><th>Severidade</th><th>Mensagem</th><th>Rota</th><th></th></tr></thead>
          <tbody>
            {items.map(e => (
              <tr key={e.id}>
                <td>{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                <td><span className={"ad-badge " + (e.severity==="fatal"||e.severity==="error"?"err":e.severity==="warn"?"warn":"ok")}>{e.severity}</span></td>
                <td style={{maxWidth:420,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={e.message}>{e.message}</td>
                <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#6B7280"}}>{e.route ?? "—"}</td>
                <td>{!e.resolved_at && <button className="ad-btn ghost" onClick={()=>resolve(e.id)}>Resolver</button>}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={5} style={{textAlign:"center",padding:30,color:"#6B7280"}}>Nenhum erro</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}