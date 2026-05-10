import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/manutencao")({ component: MaintPage });

type W = { id: string; title: string; message: string | null; starts_at: string; ends_at: string; block_access: boolean };

function MaintPage() {
  const [list, setList] = useState<W[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [block, setBlock] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("maintenance_windows").select("*").order("starts_at", { ascending: false });
    setList((data ?? []) as W[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!title || !starts || !ends) { toast.error("Preencha título, início e fim"); return; }
    const { error } = await supabase.from("maintenance_windows").insert({ title, message: message || null, starts_at: new Date(starts).toISOString(), ends_at: new Date(ends).toISOString(), block_access: block });
    if (error) toast.error(error.message); else { toast.success("Janela criada"); setTitle(""); setMessage(""); setStarts(""); setEnds(""); load(); }
  };
  const del = async (id: string) => { if (!confirm("Excluir janela?")) return; const { error } = await supabase.from("maintenance_windows").delete().eq("id", id); if (error) toast.error(error.message); else { toast.success("Excluída"); load(); } };

  const now = Date.now();
  return (
    <AdminLayout title="Manutenção" subtitle="Agende janelas e bloqueie acesso durante o período">
      <div className="ad-card" style={{marginBottom:18}}>
        <h3>Nova janela</h3>
        <div className="ad-row">
          <div className="ad-field" style={{flex:2,minWidth:220}}><label>Título</label><input className="ad-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Manutenção programada"/></div>
          <div className="ad-field" style={{flex:3,minWidth:280}}><label>Mensagem</label><input className="ad-input" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Estamos atualizando o sistema..."/></div>
        </div>
        <div className="ad-row" style={{marginTop:10}}>
          <div className="ad-field"><label>Início</label><input className="ad-input" type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)}/></div>
          <div className="ad-field"><label>Fim</label><input className="ad-input" type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/></div>
          <div className="ad-field"><label>Bloquear acesso?</label><label style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><input type="checkbox" checked={block} onChange={e=>setBlock(e.target.checked)}/> sim</label></div>
          <button className="ad-btn" onClick={save}>Agendar</button>
        </div>
      </div>

      <div className="ad-card" style={{padding:0,overflow:"hidden"}}>
        <table className="ad-table">
          <thead><tr><th>Título</th><th>Início</th><th>Fim</th><th>Status</th><th>Bloqueio</th><th></th></tr></thead>
          <tbody>
            {list.map(w => {
              const s = new Date(w.starts_at).getTime(), e = new Date(w.ends_at).getTime();
              const status = now < s ? "Agendada" : now > e ? "Concluída" : "Em andamento";
              const cls = status === "Em andamento" ? "warn" : status === "Agendada" ? "ok" : "free";
              return <tr key={w.id}>
                <td style={{fontWeight:600}}>{w.title}</td>
                <td>{new Date(w.starts_at).toLocaleString("pt-BR")}</td>
                <td>{new Date(w.ends_at).toLocaleString("pt-BR")}</td>
                <td><span className={"ad-badge "+cls}>{status}</span></td>
                <td>{w.block_access ? "Total" : "Apenas aviso"}</td>
                <td><button className="ad-btn ghost" onClick={()=>del(w.id)}>Excluir</button></td>
              </tr>;
            })}
            {list.length===0 && <tr><td colSpan={6} style={{textAlign:"center",padding:30,color:"#6B7280"}}>Sem janelas</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}