import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/atividades")({ component: ActPage });

type Ev = { id: string; user_id: string | null; event_type: string; route: string | null; created_at: string };

// Tradução de códigos técnicos de eventos para frases que qualquer pessoa entende.
const EVENT_LABELS: Record<string, string> = {
  auth_signup: "Criou uma conta",
  auth_login: "Entrou no app",
  auth_logout: "Saiu do app",
  login_concluido: "Login concluído",
  cadastro_concluido: "Cadastro concluído",
  click_logar: "Clicou em Entrar",
  click_entrar: "Clicou em Entrar",
  click_cadastrar_gratis: "Clicou em Cadastrar grátis",
  page_view: "Abriu uma página",
  page_view_login: "Abriu a tela de login",
  page_view_cadastro: "Abriu a tela de cadastro",
  page_view_dashboard: "Abriu o painel principal",
  click: "Clicou em algum botão",
  form_error: "Erro ao preencher formulário",
  user_idle_30s: "Ficou 30s sem mexer",

  turma_criada: "Criou uma turma",
  aluno_criado: "Cadastrou um aluno",

  trilha_gerada: "Gerou uma trilha de aprendizagem",
  plano_aula_gerado: "Gerou um plano de aula",
  plano_aula_salvo: "Salvou um plano de aula",
  atividade_gerada: "Gerou uma atividade",
  atividade_pcd_gerada: "Gerou atividade adaptada (inclusão)",
  roteiro_ei_gerado: "Gerou roteiro de Educação Infantil",
  pei_criado: "Criou um PEI",
  pei_atualizado: "Atualizou um PEI",
  parecer_inclusao_gerado: "Gerou parecer de inclusão",
  relatorio_gerado: "Gerou um relatório",
  curriculo_municipal_upload: "Enviou o currículo do município",
  agenda_evento_criado: "Criou um evento na agenda",
  sofia_chat_mensagem: "Mandou mensagem para a Sofia",

  documento_exportado: "Exportou um documento (PDF/Word)",
  documento_visualizado: "Abriu um documento para ver",
  creditos_insuficientes: "Tentou usar sem créditos suficientes",
  upgrade_click: "Clicou para fazer upgrade",
  click_ver_planos: "Abriu a página de planos",
  click_fazer_plano: "Clicou em assinar um plano",
  plano_contratado: "Assinou um plano",
  sofia_card_toggled: "Abriu/fechou um card da Sofia",
  ia_falha: "A IA falhou em responder",
  sofia_feedback: "Deu feedback para a Sofia",
  onboarding_iniciado: "Começou o cadastro inicial",
  onboarding_etapa: "Passou de etapa no cadastro inicial",
  onboarding_concluido: "Terminou o cadastro inicial",
  busca_realizada: "Fez uma busca",
  filtro_aplicado: "Aplicou um filtro",
  form_abandonado: "Abandonou um formulário",
  sessao_iniciada: "Começou uma nova sessão",
  compartilhamento: "Compartilhou algo",
  first_value_event: "Teve o primeiro resultado útil",

  ref_visualizar_secao: "Indicação: viu a seção de convidar",
  ref_copiar_link: "Indicação: copiou o link",
  ref_compartilhar: "Indicação: compartilhou o link",
  ref_cadastro_via_link: "Indicação: alguém entrou pelo link",
  ref_registrado: "Indicação: amigo concluiu o cadastro",
  ref_registro_falhou: "Indicação: tentativa de cadastro falhou",
  ref_conversao: "Indicação: amigo virou pagante",
  promo_code_redeemed: "Resgatou um código de desconto",
};

function labelForEvent(ev: string): string {
  if (EVENT_LABELS[ev]) return EVENT_LABELS[ev];
  // fallback: troca underline por espaço e deixa a 1ª letra maiúscula
  const pretty = ev.replace(/_/g, " ").trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function ActPage() {
  const [events, setEvents] = useState<Ev[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("activity_events").select("id,user_id,event_type,route,created_at").order("created_at",{ascending:false}).limit(150);
      setEvents((data ?? []) as Ev[]);
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
    <AdminLayout title="O que está acontecendo agora" subtitle="Lista em tempo real das ações que as pessoas estão fazendo no app">
      <div className="ad-card">
        <h3>Funções mais usadas pelos usuários</h3>
        {top.length === 0 ? (
          <p style={{fontSize:13,color:"#6B7280"}}>Sem dados ainda.</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
            {top.map(([k,v]) => (
              <div key={k}>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Inter',sans-serif",fontSize:12,marginBottom:4}}>
                  <span style={{fontWeight:600,color:"#0F1B36"}} title={k}>{labelForEvent(k)}</span>
                  <span style={{color:"#6B7280",fontWeight:700}}>{v} {v === 1 ? "vez" : "vezes"}</span>
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