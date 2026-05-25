import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader } from "@/components/Header";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";

const VIGENCIA = "25 de maio de 2026";

export function Termos() {
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
        @media (max-width: 900px) { .legal-grid { grid-template-columns: 1fr; } .legal-pad { padding: 20px; } }
      `}</style>
      <div className="legal-grid">
        <AppSidebar active="settings" />
        <main style={{ width: "100%", minWidth: 0 }}>
          <AppHeader />
          <div className="legal-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <FileText size={22} color="#FF7A45" />
              <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Termos de Uso</h1>
            </div>
            <p style={{ color: "#6B7691", fontSize: 14, marginTop: 4, marginBottom: 18 }}>
              Regras de utilização da plataforma AgilizaProf / Sofia. Veja também a <Link to="/privacidade" style={{ color: "#FF7A45", fontWeight: 600 }}>Política de Privacidade</Link>.
            </p>

            <section className="legal-card" aria-labelledby="termos-title">
              <div className="legal-meta">📅 Vigência: {VIGENCIA} · 🇧🇷 Legislação brasileira aplicável</div>
              <h2 id="termos-title">1. Quem somos</h2>
              <p>
                O <strong>AgilizaProf</strong> é uma plataforma de apoio pedagógico para educadores(as) que utiliza a assistente <strong>Sofia</strong> — uma inteligência artificial alinhada aos <strong>Princípios da Sofia</strong>, à <strong>BNCC</strong>, à <strong>LDB</strong>, ao <strong>ECA</strong>, à <strong>LBI (Lei 13.146/2015)</strong>, à <strong>Lei 14.254/2021</strong> e à <strong>LGPD (Lei 13.709/2018)</strong>.
              </p>

              <h2>2. Aceitação dos termos</h2>
              <p>
                Ao criar uma conta ou utilizar qualquer funcionalidade da plataforma, você declara ter <strong>18 anos ou mais</strong>, capacidade civil plena e concorda com estes Termos e com a Política de Privacidade. Se você não concorda, não utilize o serviço.
              </p>

              <h2>3. Cadastro e conta</h2>
              <ul>
                <li>O cadastro exige e-mail válido e dados verídicos. Você é responsável pela confidencialidade da sua senha.</li>
                <li>Conta é <strong>pessoal e intransferível</strong>. Compartilhamento de credenciais é vedado e pode levar à suspensão.</li>
                <li>Você pode encerrar a conta a qualquer momento em <em>Configurações</em>, com efeito sobre a exclusão dos seus dados conforme a Política de Privacidade.</li>
              </ul>

              <h2>4. Uso aceitável</h2>
              <p>Você se compromete a <strong>não</strong>:</p>
              <ul>
                <li>Inserir dados de estudantes sem base legal adequada (consentimento dos responsáveis, obrigação legal da escola ou execução de política pública de educação — art. 7º e art. 14 da LGPD).</li>
                <li>Utilizar a Sofia para discurso de ódio, conteúdo discriminatório, capacitista, racista, sexista, LGBTfóbico ou qualquer violação ao ECA e à LBI.</li>
                <li>Tentar burlar limites técnicos, fazer engenharia reversa, scraping massivo ou uso automatizado não autorizado.</li>
                <li>Apresentar conteúdo gerado pela Sofia como se não houvesse mediação de IA quando isso for exigido pela sua rede de ensino.</li>
              </ul>

              <h2>5. Princípios da Sofia (parte integrante destes Termos)</h2>
              <p>
                A Sofia opera sob 13 princípios públicos — entre eles <strong>Dados Reais</strong>, <strong>Linguagem Humanizada</strong>, <strong>Legalidade</strong>, <strong>Sua Autoria</strong>, <strong>Educação Inclusiva</strong> e <strong>Confidencialidade</strong>. Você é a <strong>autora</strong> do conteúdo final; a Sofia é apoio e nunca substitui sua decisão pedagógica. Consulte-os em <Link to="/configuracoes" style={{ color: "#FF7A45", fontWeight: 600 }}>Configurações → Princípios da Sofia</Link>.
              </p>

              <h2>6. Conteúdo gerado por IA</h2>
              <ul>
                <li>Saídas da Sofia são <strong>sugestões pedagógicas</strong> baseadas em legislação vigente e nos dados que você cadastrou. A revisão profissional do(a) educador(a) é sempre necessária.</li>
                <li>A Sofia <strong>não substitui</strong> diagnóstico clínico, laudo, parecer jurídico ou decisão de equipe multidisciplinar.</li>
                <li>Você mantém a titularidade do conteúdo que produz; nos concede licença limitada para processar e armazenar com a finalidade exclusiva de prestar o serviço.</li>
              </ul>

              <h2>7. Planos, créditos e pagamento</h2>
              <ul>
                <li>Plano <strong>gratuito</strong> com créditos semanais; plano <strong>Pro</strong> mensal/anual com créditos ampliados. Os limites são exibidos em tempo real no app.</li>
                <li>Pagamentos são processados por provedores certificados (ex.: Mercado Pago). Não armazenamos dados completos de cartão.</li>
                <li><strong>Arrependimento (art. 49 do CDC):</strong> assinaturas adquiridas online podem ser canceladas em até <strong>7 dias</strong> com reembolso integral, salvo uso substancial dos créditos no período.</li>
                <li>Renovações são informadas com antecedência; o cancelamento mantém o acesso até o fim do ciclo vigente.</li>
              </ul>

              <h2>8. Disponibilidade e suporte</h2>
              <p>
                Buscamos alta disponibilidade, mas o serviço é fornecido <strong>"como está"</strong>, podendo haver janelas de manutenção. Comunicamos incidentes relevantes e atuamos para restabelecer o serviço com a maior brevidade possível.
              </p>

              <h2>9. Propriedade intelectual</h2>
              <p>
                Marca, identidade visual, código, modelos de prompt, base teórica curada e demais elementos do AgilizaProf pertencem aos seus titulares. É vedada a reprodução não autorizada.
              </p>

              <h2>10. Suspensão e encerramento</h2>
              <p>
                Podemos suspender ou encerrar contas que violem estes Termos, a legislação vigente ou que coloquem em risco crianças, adolescentes ou outros usuários, com notificação prévia sempre que possível.
              </p>

              <h2>11. Limitação de responsabilidade</h2>
              <p>
                Na máxima extensão permitida em lei, não nos responsabilizamos por danos indiretos decorrentes do uso da plataforma. Nada nestes Termos limita direitos do consumidor previstos no <strong>CDC</strong>.
              </p>

              <h2>12. Alterações</h2>
              <p>
                Estes Termos podem ser atualizados para refletir mudanças legais ou de produto. Alterações relevantes serão comunicadas por e-mail e/ou aviso no app, com prazo razoável antes da vigência.
              </p>

              <h2>13. Lei aplicável e foro</h2>
              <p>
                Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do usuário consumidor para dirimir controvérsias, salvo regra cogente em sentido diverso.
              </p>

              <h2>14. Contato</h2>
              <p>
                Dúvidas, solicitações ou denúncias: <strong>suporte@agilizaprof.com.br</strong>. Para assuntos de proteção de dados, fale com o Encarregado (DPO) por <strong>dpo@agilizaprof.com.br</strong>.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}