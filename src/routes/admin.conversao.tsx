import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/conversao")({ component: ConvPage });

function ConvPage() {
  const [data, setData] = useState<{ loginVisits: number; siteVisits: number; signups: number; devices: Record<string,number>; os: Record<string,number>; browser: Record<string,number> } | null>(null);
  const [periodo, setPeriodo] = useState(30);
  const periodoLabel: Record<number, string> = {
    1: "Últimas 24 horas", 7: "Últimos 7 dias", 15: "Últimos 15 dias",
    30: "Últimos 30 dias", 60: "Últimos 60 dias", 90: "Últimos 90 dias",
    180: "Últimos 180 dias", 365: "Último ano",
  };
  useEffect(() => {
    (async () => {
      setData(null);
      const since = new Date(Date.now() - periodo*864e5).toISOString();
      const [vAll, vLogin, signupsQ] = await Promise.all([
        supabase.from("page_visits").select("session_id,device_type,os,browser,is_login_page").gte("created_at", since),
        supabase.from("page_visits").select("session_id").eq("is_login_page", true).gte("created_at", since),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      const all = vAll.data ?? [];
      const uniq = (arr: string[]) => new Set(arr).size;
      const dev: Record<string,number> = {}, os: Record<string,number> = {}, br: Record<string,number> = {};
      all.forEach(v => {
        if (v.device_type) dev[v.device_type] = (dev[v.device_type] ?? 0) + 1;
        if (v.os) os[v.os] = (os[v.os] ?? 0) + 1;
        if (v.browser) br[v.browser] = (br[v.browser] ?? 0) + 1;
      });
      setData({
        loginVisits: uniq((vLogin.data ?? []).map(v=>v.session_id)),
        siteVisits: uniq(all.map(v=>v.session_id)),
        signups: signupsQ.count ?? 0,
        devices: dev, os, browser: br,
      });
    })();
  }, [periodo]);
  const conv = data && data.loginVisits ? ((data.signups / data.loginVisits) * 100).toFixed(1) : "0";
  return (
    <AdminLayout title="Conversão" subtitle={periodoLabel[periodo]}>
      <div className="ad-card" style={{marginBottom:14}}>
        <div className="ad-row">
          <div className="ad-field">
            <label>Período</label>
            <select className="ad-select" value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
              {Object.entries(periodoLabel).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {!data ? (
        <div className="ad-card">Carregando…</div>
      ) : (
      <>
      <div className="ad-stat-grid" style={{marginBottom:18}}>
        <div className="ad-stat"><div className="ad-stat-label">Visitantes únicos</div><div className="ad-stat-val">{data.siteVisits}</div></div>
        <div className="ad-stat"><div className="ad-stat-label">Visitas /auth</div><div className="ad-stat-val">{data.loginVisits}</div></div>
        <div className="ad-stat"><div className="ad-stat-label">Cadastros</div><div className="ad-stat-val">{data.signups}</div></div>
        <div className="ad-stat"><div className="ad-stat-label">Taxa de conversão</div><div className="ad-stat-val ad-stat-accent">{conv}%</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
        <Group title="Dispositivo" data={data.devices}/>
        <Group title="Sistema operacional" data={data.os}/>
        <Group title="Navegador" data={data.browser}/>
      </div>
      </>
      )}
    </AdminLayout>
  );
}

function Group({ title, data }: { title: string; data: Record<string,number> }) {
  const total = Object.values(data).reduce((a,b)=>a+b,0) || 1;
  const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  return (
    <div className="ad-card">
      <h3>{title}</h3>
      {entries.length === 0 ? <p style={{fontSize:13,color:"#6B7280"}}>Sem dados</p> :
        entries.map(([k,v]) => (
          <div key={k} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{fontWeight:600}}>{k}</span><span style={{color:"#6B7280"}}>{v} ({((v/total)*100).toFixed(0)}%)</span></div>
            <div className="ad-bar"><div style={{width:`${(v/total)*100}%`}}/></div>
          </div>
        ))
      }
    </div>
  );
}