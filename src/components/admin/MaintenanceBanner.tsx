import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";

type Window = {
  id: string;
  title: string;
  message: string | null;
  starts_at: string;
  ends_at: string;
  block_access: boolean;
};

export function MaintenanceBanner() {
  const [windows, setWindows] = useState<Window[]>([]);
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const [dispensados, setDispensados] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDispensados(JSON.parse(localStorage.getItem("aviso-dispensado") || "[]"));
    } catch {
      setDispensados([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("maintenance_windows")
        .select("id,title,message,starts_at,ends_at,block_access")
        .lte("starts_at", now)
        .gte("ends_at", now);
      setWindows((data ?? []) as Window[]);
    };
    load();
    const ch = supabase.channel("maint-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_windows" }, load)
      .subscribe();
    const t = setInterval(load, 60_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, []);

  const active = windows[0];
  if (!active) return null;

  const blocking = active.block_access && !isAdmin && !location.pathname.startsWith("/admin") && !location.pathname.startsWith("/auth");

  if (blocking) {
    return (
      <div style={{position:"fixed",inset:0,zIndex:9999,background:"linear-gradient(135deg,#14161F,#14161F)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
        <div style={{maxWidth:520,textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#0B7A55,#0B7A55)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:"0 10px 30px rgba(11,122,85,.4)"}}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <h1 style={{fontFamily:"'Sora',serif",fontWeight:800,fontSize:28,margin:0}}>{active.title}</h1>
          <p style={{fontFamily:"'DM Sans',sans-serif",color:"rgba(255,255,255,.78)",marginTop:12,lineHeight:1.55}}>{active.message ?? "Estamos em manutenção. Voltamos em instantes."}</p>
          <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,marginTop:18,color:"rgba(255,255,255,.5)"}}>Janela: {new Date(active.starts_at).toLocaleString("pt-BR")} → {new Date(active.ends_at).toLocaleString("pt-BR")}</p>
        </div>
      </div>
    );
  }

  if (dispensados.includes(active.id)) return null;
  const dispensar = () => {
    const novos = [...dispensados, active.id];
    setDispensados(novos);
    try {
      localStorage.setItem("aviso-dispensado", JSON.stringify(novos.slice(-20)));
    } catch {
      /* sem armazenamento: o aviso volta na próxima visita */
    }
  };

  return (
    <div role="status" style={{position:"sticky",top:0,zIndex:50,background:"#FFE2A8",color:"#14161F",borderBottom:"2px solid #14161F",padding:"8px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13.5,fontWeight:600,display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
      <span aria-hidden>📣</span>
      <span style={{minWidth:0,overflowWrap:"anywhere"}}>
        <b>{active.title}</b>{active.message ? ` · ${active.message}` : ""}
      </span>
      <button type="button" aria-label="Fechar aviso" onClick={dispensar} style={{flex:"none",width:28,height:28,borderRadius:8,border:"1.5px solid #14161F",background:"#fff",cursor:"pointer",fontWeight:800,lineHeight:1}}>×</button>
    </div>
  );
}
