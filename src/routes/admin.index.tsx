import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

type Stats = {
  total: number; active7: number; active30: number;
  pro_mensal: number; pro_anual: number; cortesia: number; free: number;
  docsTotalMonth: number; docsAvgPerUser: number;
  topEvents: Array<{ event_type: string; count: number }>;
  nextMaint: { title: string; starts_at: string } | null;
};

const APP_URL = "https://agilizaprof.app.br";

function AdminOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7*864e5).toISOString();
      const d30 = new Date(now.getTime() - 30*864e5).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [profilesQ, subsQ, ev7, ev30, evMonth, maintQ] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("user_id,plano,ciclo,status"),
        supabase.from("activity_events").select("user_id").gte("created_at", d7),
        supabase.from("activity_events").select("user_id").gte("created_at", d30),
        supabase.from("activity_events").select("event_type,user_id").gte("created_at", monthStart),
        supabase.from("maintenance_windows").select("title,starts_at").gt("starts_at", now.toISOString()).order("starts_at").limit(1).maybeSingle(),
      ]);

      const subs = subsQ.data ?? [];
      const pro_mensal = subs.filter(x => x.plano === "pro" && x.ciclo === "mensal" && x.status === "active").length;
      const pro_anual = subs.filter(x => x.plano === "pro" && x.ciclo === "anual" && x.status === "active").length;
      const cortesia = subs.filter(x => x.plano === "pro" && x.ciclo === "cortesia" && x.status === "active").length;
      const free = subs.filter(x => x.plano === "free").length;

      const set7 = new Set((ev7.data ?? []).map(e => e.user_id));
      const set30 = new Set((ev30.data ?? []).map(e => e.user_id));
      const monthEvents = evMonth.data ?? [];
      const docs = monthEvents.filter(e => ["doc_generated","pei_created","parecer_gerado","atividade_gerada","trilha_gerada","relatorio_gerado","roteiro_ei_gerado"].includes(e.event_type));
      const usersInMonth = new Set(monthEvents.map(e => e.user_id)).size || 1;

      const counter: Record<string, number> = {};
      monthEvents.forEach(e => { counter[e.event_type] = (counter[e.event_type] ?? 0) + 1; });
      const topEvents = Object.entries(counter).map(([event_type, count]) => ({ event_type, count })).sort((a,b)=>b.count-a.count).slice(0,8);

      setS({
        total: profilesQ.count ?? 0,
        active7: set7.size, active30: set30.size,
        pro_mensal, pro_anual, cortesia, free,
        docsTotalMonth: docs.length,
        docsAvgPerUser: docs.length / usersInMonth,
        topEvents,
        nextMaint: maintQ.data,
      });
    })();
  }, []);

  useEffect(() => {
    QRCode.toDataURL(APP_URL, { width: 180, margin: 2 }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, []);

  if (!s) return <AdminLayout title="Visão geral"><div className="ad-card">Carregando…</div></AdminLayout>;
  const proTotal = s.pro_mensal + s.pro_anual + s.cortesia;
  const mrr = s.pro_mensal * 34.9 + (s.pro_anual * 247) / 12;
  const maxEv = Math.max(1, ...s.topEvents.map(x => x.count));

  return (
    <AdminLayout title="Visão geral" subtitle="Saúde da plataforma em tempo real">
      <div className="ad-stat-grid" style={{marginBottom:18}}>
        <Stat label="Total de pessoas cadastradas" value={s.total} />
        <Stat label="Usaram nos últimos 7 dias" value={s.active7} hint={`${s.active30} usaram nos últimos 30 dias`} />
        <Stat label="Documentos criados este mês" value={s.docsTotalMonth} hint={`média de ${s.docsAvgPerUser.toFixed(1)} por pessoa`} />
        <Stat label="Assinantes do plano mensal" value={s.pro_mensal} accent />
        <Stat label="Assinantes do plano anual" value={s.pro_anual} accent />
        <Stat label="Cortesias liberadas" value={s.cortesia} />
        <Stat label="Receita prevista por mês" value={`R$ ${mrr.toFixed(0)}`} hint={`${proTotal} assinantes pagantes`} />
        <Stat label="Usando o plano gratuito" value={s.free} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:18}}>
        <div className="ad-card">
          <h3>Modalidade mais usada (mês)</h3>
          {s.topEvents.length === 0 ? <p style={{fontSize:13,color:"#6B7280"}}>Sem dados ainda.</p> :
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {s.topEvents.map(ev => (
                <div key={ev.event_type}>
                  <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Inter',sans-serif",fontSize:12,marginBottom:4}}>
                    <span style={{fontWeight:600,color:"#0F1B36"}}>{ev.event_type}</span>
                    <span style={{color:"#6B7280",fontWeight:700}}>{ev.count}</span>
                  </div>
                  <div className="ad-bar"><div style={{width:`${(ev.count/maxEv)*100}%`}}/></div>
                </div>
              ))}
            </div>
          }
        </div>
        <div className="ad-card">
          <h3>Próxima manutenção</h3>
          {s.nextMaint ? (
            <div>
              <p style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:15,color:"#0F1B36",margin:0}}>{s.nextMaint.title}</p>
              <p style={{fontSize:12,color:"#6B7280",marginTop:6}}>{new Date(s.nextMaint.starts_at).toLocaleString("pt-BR")}</p>
            </div>
          ) : <p style={{fontSize:13,color:"#6B7280"}}>Nenhuma agendada.</p>}
        </div>
        <div className="ad-card" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <h3 style={{margin:0}}>Acesso ao app</h3>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code do aplicativo" style={{width:150,height:150,borderRadius:8,border:"1px solid #E5E7EB"}} />
          ) : (
            <div style={{width:150,height:150,borderRadius:8,border:"1px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",color:"#6B7280",fontSize:12}}>Gerando QR…</div>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(APP_URL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
            }}
            style={{display:"flex",alignItems:"center",gap:6,fontSize:12,padding:"6px 12px",borderRadius:6,border:"1px solid #E5E7EB",background:"#fff",cursor:"pointer",color:"#0F1B36"}}
          >
            {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <p style={{fontSize:11,color:"#6B7280",margin:0,textAlign:"center",wordBreak:"break-all"}}>{APP_URL}</p>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent?: boolean }) {
  return (
    <div className="ad-stat">
      <div className="ad-stat-label">{label}</div>
      <div className={"ad-stat-val" + (accent ? " ad-stat-accent" : "")}>{value}</div>
      {hint && <div className="ad-stat-hint">{hint}</div>}
    </div>
  );
}