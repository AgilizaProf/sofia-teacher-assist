import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pro")({ component: ProPage });

type Grant = { id: string; email: string; ciclo: string; dias: number; motivo: string | null; status: string; expires_at: string | null; created_at: string; user_id: string | null };

function ProPage() {
  const [email, setEmail] = useState("");
  const [ciclo, setCiclo] = useState<"mensal"|"anual"|"cortesia">("anual");
  const [dias, setDias] = useState(365);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [grants, setGrants] = useState<Grant[]>([]);

  const load = async () => {
    const { data } = await supabase.from("pro_grants").select("*").order("created_at", { ascending: false }).limit(100);
    setGrants((data ?? []) as Grant[]);
  };
  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!email.trim()) { toast.error("Informe um e-mail"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_grant_pro", { _email: email, _ciclo: ciclo, _dias: dias, _motivo: motivo || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success((data as { status: string }).status === "pending" ? "Concessão pendente — será aplicada no signup" : "Acesso Pro concedido");
    setEmail(""); setMotivo("");
    load();
  };

  const revoke = async (g: Grant) => {
    if (!g.user_id) { toast.error("Sem usuário associado"); return; }
    if (!confirm(`Revogar Pro de ${g.email}?`)) return;
    const { error } = await supabase.rpc("admin_revoke_pro", { _user_id: g.user_id });
    if (error) toast.error(error.message); else { toast.success("Acesso revogado"); load(); }
  };

  return (
    <AdminLayout title="Gestão Pro" subtitle="Conceda acesso Pro manualmente por e-mail">
      <div className="ad-card" style={{marginBottom:18}}>
        <h3>Conceder acesso</h3>
        <div className="ad-row">
          <div className="ad-field" style={{flex:2,minWidth:240}}>
            <label>E-mail do usuário</label>
            <input className="ad-input" type="email" placeholder="usuario@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="ad-field">
            <label>Plano</label>
            <select className="ad-select" value={ciclo} onChange={e => { const v = e.target.value as "mensal"|"anual"|"cortesia"; setCiclo(v); setDias(v === "anual" ? 365 : v === "mensal" ? 30 : 90); }}>
              <option value="mensal">Pro Mensal</option>
              <option value="anual">Pro Anual</option>
              <option value="cortesia">Cortesia</option>
            </select>
          </div>
          <div className="ad-field">
            <label>Dias</label>
            <input className="ad-input" type="number" min={1} value={dias} onChange={e => setDias(Number(e.target.value))} style={{width:90}}/>
          </div>
          <div className="ad-field" style={{flex:2,minWidth:200}}>
            <label>Motivo (opcional)</label>
            <input className="ad-input" placeholder="ex.: parceria, reembolso..." value={motivo} onChange={e => setMotivo(e.target.value)} />
          </div>
          <button className="ad-btn" onClick={grant} disabled={busy}>{busy ? "Concedendo…" : "Conceder Pro"}</button>
        </div>
        <p style={{fontSize:11,color:"#6B7280",marginTop:10}}>Se o e-mail ainda não estiver cadastrado, a concessão fica pendente e é aplicada automaticamente no primeiro login do usuário.</p>
      </div>

      <div className="ad-card" style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #E5E9F2"}}><h3 style={{margin:0}}>Histórico de concessões</h3></div>
        <table className="ad-table">
          <thead><tr><th>E-mail</th><th>Plano</th><th>Dias</th><th>Status</th><th>Validade</th><th>Quando</th><th></th></tr></thead>
          <tbody>
            {grants.map(g => (
              <tr key={g.id}>
                <td>{g.email}</td>
                <td><span className="ad-badge pro">{g.ciclo}</span></td>
                <td>{g.dias}</td>
                <td><span className={"ad-badge " + (g.status === "applied" ? "ok" : g.status === "pending" ? "warn" : "free")}>{g.status}</span></td>
                <td>{g.expires_at ? new Date(g.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                <td>{new Date(g.created_at).toLocaleString("pt-BR")}</td>
                <td>{g.status === "applied" && <button className="ad-btn ghost" onClick={() => revoke(g)}>Revogar</button>}</td>
              </tr>
            ))}
            {grants.length === 0 && <tr><td colSpan={7} style={{textAlign:"center",padding:30,color:"#6B7280"}}>Nenhuma concessão ainda</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}