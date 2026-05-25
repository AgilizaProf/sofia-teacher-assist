import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader } from "@/components/Header";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

const VIGENCIA = "25 de maio de 2026";

export function Privacidade() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FB", color: "#1B2A4E", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: sidebarCss }} />
      <style>{`
        .legal-grid { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
        .legal-pad { padding: 24px 36px 32px; width: 100%; max-width: 920px; margin: 0 auto; }
        .legal-card { background:#fff; border:1px solid #E4E8F0; border-radius:14px; padding:28px; }
        .legal-card h2 { font-family:'Fraunces',serif; font-size:18px; font-weight:700; margin:24px 0 8px; color:#1B2A4E; }
        .legal-card h2:first-of-type { margin-top: 8px; }
        .legal-card p, .legal-card li { font-size:14px; line-height:1.65; color:#3A4A6B; }
        .legal-card ul { padding-left: 20px; margin: 6px 0 10px; }
        .legal-card strong { color:#1B2A4E; }
        .legal-meta { background:#FFF1E8; border:1px solid #FED7AA; color:#7C2D12; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:18px; }
        .rights-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin: 8px 0 4px; }
        .right-chip { background:#FBFAF6; border:1px solid #E4E8F0; border-radius:10px; padding:10px 12px; font-size:13px; color:#1B2A4E; }
        @media (max-width: 900px) { .legal-grid { grid-template-columns: 1fr; } .legal-pad { padding: 20px; } .rights-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div className="legal-grid">
        <AppSidebar active="settings" />
        <main style={{ width: "100%", minWidth: 0 }}>
          <AppHeader />
          <div className="legal-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <ShieldCheck size={22} color="#FF7A45" />
              <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Política de Privacidade</h1>
            </div>
            <p style={{ color: "#6B7691", fontSize: 14, marginTop: 4, marginBottom: 18 }}>
              Como tratamos seus dados pessoais — em conformidade com a LGPD, o ECA e a LBI. Veja também os <Link to="/termos" style={{ color: "#FF7A45", fontWeight: 600 }}>Termos de Uso</Link>.
            </p>

            <section className="legal-card" aria-labelledby="priv-title">
              <div className="legal-meta">📅 Vigência: {VIGENCIA} · 🇧🇷 Servidores no Brasil · 🔒 100% LGPD</div>

              <h2 id="priv-title">1. Controlador e Encarregado (DPO)</h2>
              <p>
                O <strong>AgilizaProf</strong> é o <strong>controlador</strong> dos dados pessoais tratados na plataforma. O Encarregado pelo Tratamento de Dados (DPO) pode ser contatado em <strong>dpo@agilizaprof.com.br</strong>.
              </p>

              <h2>2. Princípios que guiam o tratamento</h2>
              <p>
                Aplicamos os princípios do <strong>art. 6º da LGPD</strong>: finalidade, adequação, necessidade, livre acesso, qualidade dos dados, transparência, segurança, prevenção, não discriminação e responsabilização. Esses princípios estão alinhados aos <strong>Princípios da Sofia</strong>, em especial <em>Confidencialidade</em>, <em>Linguagem Humanizada</em> e <em>Legalidade</em>.
              </p>

              <h2>3. Quais dados tratamos</h2>
              <ul>
                <li><strong>Cadastro do(a) educador(a):</strong> nome, e-mail, senha (com hash), foto opcional, escola, etapa de atuação.</li>
                <li><strong>Conteúdo pedagógico:</strong> turmas, planos de aula, atividades, currículos municipais anexados, relatórios e pareceres gerados.</li>
                <li><strong>Dados de estudantes inseridos pelo(a) educador(a):</strong> nome/iniciais, ano escolar, observações pedagógicas e, quando aplicável, informações sobre laudos/CIDs para fins de adaptação inclusiva.</li>
                <li><strong>Pagamento:</strong> dados mínimos para faturamento; cartões são processados por gateway certificado e <strong>não</strong> ficam armazenados em nossos servidores.</li>
                <li><strong>Técnicos:</strong> logs, IP, dispositivo, métricas de uso para segurança, melhoria do serviço e cumprimento de obrigação legal.</li>
              </ul>

              <h2>4. Dados de crianças e adolescentes</h2>
              <p>
                Tratamos dados de estudantes <strong>no melhor interesse</strong> (art. 14 da LGPD e ECA), exclusivamente para finalidades pedagógicas: adaptações inclusivas (LBI), relatórios escolares e planejamento. A inserção é feita pelo(a) educador(a), que declara possuir base legal adequada — geralmente a <strong>execução de política pública de educação</strong> ou o <strong>consentimento específico</strong> dos responsáveis. Não realizamos perfilamento comercial nem direcionamos publicidade a estudantes.
              </p>

              <h2>5. Bases legais (art. 7º e art. 11 da LGPD)</h2>
              <ul>
                <li><strong>Execução de contrato</strong> com o(a) educador(a) titular da conta.</li>
                <li><strong>Consentimento</strong> para comunicações opcionais e funcionalidades acessórias.</li>
                <li><strong>Cumprimento de obrigação legal/regulatória</strong> (educação, fiscal, consumerista).</li>
                <li><strong>Legítimo interesse</strong> para segurança e prevenção a fraudes, sempre com testes de balanceamento.</li>
                <li><strong>Tutela da saúde</strong> e proteção de pessoas com deficiência, para dados sensíveis vinculados a adaptações inclusivas.</li>
              </ul>

              <h2>6. Finalidades</h2>
              <ul>
                <li>Operar planejamento, atividades, relatórios, PEI/PDI e demais ferramentas da Sofia.</li>
                <li>Personalizar sugestões pedagógicas conforme BNCC e currículo municipal anexado pelo(a) educador(a).</li>
                <li>Garantir segurança, prevenir abuso e cumprir obrigações legais.</li>
                <li>Comunicações transacionais (recuperação de senha, faturamento) e, com seu consentimento, novidades.</li>
              </ul>

              <h2>7. Inteligência Artificial e decisões automatizadas</h2>
              <p>
                A Sofia <strong>não toma decisões automatizadas com efeito jurídico</strong> sobre estudantes. Toda saída é uma <strong>sugestão</strong> que requer revisão profissional. Conteúdos enviados à Sofia são utilizados apenas para gerar a resposta do(a) educador(a) e <strong>não treinam modelos de terceiros</strong>. Você pode solicitar revisão humana de qualquer recomendação (art. 20 da LGPD).
              </p>

              <h2>8. Compartilhamento</h2>
              <ul>
                <li><strong>Operadores</strong> (provedores de nuvem, gateway de pagamento, e-mail transacional, modelos de IA), sob contrato e dever de sigilo.</li>
                <li><strong>Autoridades</strong>, mediante ordem legal válida.</li>
                <li>Não vendemos dados pessoais. Não compartilhamos dados de estudantes para fins comerciais.</li>
              </ul>

              <h2>9. Transferência internacional</h2>
              <p>
                Sempre que possível, hospedamos dados em <strong>servidores no Brasil</strong>. Quando subprocessadores estrangeiros forem necessários (ex.: provedores de modelos de IA), utilizamos cláusulas padrão e garantias adequadas conforme arts. 33 a 36 da LGPD.
              </p>

              <h2>10. Segurança</h2>
              <ul>
                <li>Criptografia em trânsito (TLS) e em repouso para dados sensíveis.</li>
                <li>Controle de acesso por papel (RLS), autenticação forte, logs de auditoria.</li>
                <li>Backups regulares e plano de resposta a incidentes — comunicação à ANPD e aos titulares quando aplicável (art. 48 da LGPD).</li>
              </ul>

              <h2>11. Retenção e exclusão</h2>
              <p>
                Mantemos os dados enquanto a conta estiver ativa e pelos prazos legais (ex.: fiscal). Após o encerramento, os dados pessoais são <strong>excluídos ou anonimizados em até 90 dias</strong>, exceto quando houver obrigação legal de retenção.
              </p>

              <h2>12. Seus direitos como titular (art. 18 da LGPD)</h2>
              <div className="rights-grid">
                <div className="right-chip">✅ Confirmação e acesso</div>
                <div className="right-chip">✏️ Correção de dados</div>
                <div className="right-chip">🧹 Anonimização ou eliminação</div>
                <div className="right-chip">📦 Portabilidade</div>
                <div className="right-chip">🚫 Revogação do consentimento</div>
                <div className="right-chip">ℹ️ Informação sobre compartilhamento</div>
                <div className="right-chip">🧑‍⚖️ Revisão de decisões automatizadas</div>
                <div className="right-chip">📨 Reclamação à ANPD</div>
              </div>
              <p style={{ marginTop: 10 }}>
                Para exercer qualquer direito, escreva para <strong>dpo@agilizaprof.com.br</strong>. Responderemos em até <strong>15 dias</strong>.
              </p>

              <h2>13. Cookies e tecnologias similares</h2>
              <p>
                Utilizamos cookies <strong>essenciais</strong> para autenticação e segurança, e cookies <strong>analíticos</strong> agregados para entender o uso e melhorar a experiência. Você pode gerenciá-los pelo seu navegador.
              </p>

              <h2>14. Alterações desta Política</h2>
              <p>
                Mudanças relevantes serão comunicadas por e-mail e/ou aviso no app com prazo razoável antes de entrar em vigor. O histórico de versões fica disponível mediante solicitação.
              </p>

              <h2>15. Contato</h2>
              <p>
                Encarregado (DPO): <strong>dpo@agilizaprof.com.br</strong> · Suporte: <strong>suporte@agilizaprof.com.br</strong> · ANPD: <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: "#FF7A45", fontWeight: 600 }}>gov.br/anpd</a>.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}