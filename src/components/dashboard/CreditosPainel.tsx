import { useEffect, useMemo, useState } from "react";
import { useCreditos, useHistoricoCreditos, type MovimentacaoCredito } from "@/lib/creditos/useCreditos";
import {
  CREDITOS_ANUAIS_TOTAL,
  ECONOMIA_ANUAL,
  FREE_CREDITOS_SEMANAIS,
  MESES_PT_LONGO,
  MP_ANUAL_URL,
  PRECO_ANUAL,
  PRECO_MENSAL,
  corDaBarra,
  diasAteRenovacaoMensal,
  diasAteRenovacaoSemanal,
  horasAteRenovacaoSemanal,
  isMesPico,
  mensagemContextual,
  proximoBonus,
} from "@/lib/creditos/policy";

const css = `
.cp-card{background:#fff;border:1px solid var(--border, #E4E8F0);border-radius:12px;padding:12px 14px;box-shadow:var(--shadow-sm, 0 1px 2px rgba(27,42,78,.04));display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-bottom:14px;}
.cp-card.collapsed{grid-template-columns:1fr;}
.cp-head{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--text-soft, #5B6B82);text-transform:uppercase;letter-spacing:.06em;}
.cp-head .dot{width:6px;height:6px;border-radius:50%;background:var(--accent, #FF7A45);}
.cp-saldo{font-family:'Fraunces',serif;font-weight:700;font-size:24px;line-height:1.05;color:var(--primary,#1B2A4E);letter-spacing:-0.01em;margin-top:6px;}
.cp-saldo small{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft,#5B6B82);margin-left:6px;}
.cp-totalrow{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px;font-size:11px;color:var(--text-soft,#5B6B82);}
.cp-totalrow strong{color:var(--text,#1B2A4E);font-weight:700;}
.cp-bar{height:6px;border-radius:999px;background:#EEF1F8;overflow:hidden;margin-top:8px;}
.cp-bar-fill{height:100%;border-radius:999px;transition:width .35s ease;}
.cp-bar-fill.ok{background:linear-gradient(90deg,#10B981,#34D399);}
.cp-bar-fill.warn{background:linear-gradient(90deg,#F59E0B,#FBBF24);}
.cp-bar-fill.danger{background:linear-gradient(90deg,#EF4444,#F87171);}
.cp-pct{display:flex;justify-content:space-between;font-size:10px;color:var(--text-soft,#5B6B82);margin-top:4px;}
.cp-msg{margin-top:8px;font-size:11px;color:var(--text-soft,#5B6B82);line-height:1.4;}
.cp-bonus{margin-top:8px;display:inline-flex;align-items:center;gap:4px;background:var(--accent-soft,#FFF1E8);color:var(--accent-deep,#E85F2C);padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;}
.cp-hist{border-left:1px solid var(--border-soft,#EEF1F6);padding-left:14px;display:flex;flex-direction:column;}
.cp-hist h4{font-size:11px;font-weight:700;color:var(--text-soft,#5B6B82);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px;}
.cp-hist-empty{color:var(--text-muted,#8A98AE);font-size:11px;}
.cp-hist-list{display:flex;flex-direction:column;gap:6px;flex:1;}
.cp-hist-item{display:flex;align-items:center;justify-content:space-between;font-size:11px;}
.cp-hist-q{font-weight:700;font-family:'JetBrains Mono',monospace;font-size:11px;}
.cp-hist-q.pos{color:#10B981;}
.cp-hist-q.neg{color:#EF4444;}
.cp-hist-d{color:var(--text,#1B2A4E);flex:1;margin:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cp-hist-more{margin-top:8px;font-size:11px;color:var(--accent-deep,#E85F2C);font-weight:700;background:none;border:none;padding:0;text-align:left;cursor:pointer;}
.cp-upgrade{margin-top:8px;padding:8px 10px;background:linear-gradient(135deg,#FFF1E8,#FFE4D1);border-radius:8px;font-size:11px;color:var(--accent-deep,#E85F2C);font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.cp-upgrade-text{flex:1;min-width:0;}
.cp-upgrade-btn{background:#FF7A45;color:#fff !important;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;border:none;cursor:pointer;}
.cp-upgrade-btn:hover{background:#E85F2C;color:#fff !important;}
.cp-renew{margin-top:8px;display:inline-flex;align-items:center;gap:4px;background:#EEF6FF;color:#1E40AF;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;}
.cp-compare{margin-top:10px;padding:10px;background:linear-gradient(135deg,#F8FAFF,#EEF1F8);border:1px dashed var(--border,#E4E8F0);border-radius:10px;font-size:11px;color:var(--text,#1B2A4E);}
.cp-compare h5{margin:0 0 6px;font-size:10px;font-weight:700;color:var(--text-soft,#5B6B82);text-transform:uppercase;letter-spacing:.06em;}
.cp-compare-row{display:flex;justify-content:space-between;margin:2px 0;}
.cp-compare-row strong{font-weight:700;}
.cp-compare-eco{margin-top:6px;color:#059669;font-weight:700;}
.cp-compare-cta{margin-top:8px;display:inline-block;background:#FF7A45;color:#fff !important;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;cursor:pointer;border:none;}
.cp-compare-cta:hover{background:#E85F2C;}
.cp-peak{margin-bottom:10px;padding:10px 12px;border-radius:10px;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:12px;display:flex;align-items:flex-start;gap:10px;}
.cp-peak-body{flex:1;line-height:1.45;}
.cp-peak-body strong{font-weight:700;}
.cp-peak a{color:#92400E;text-decoration:underline;font-weight:700;}
.cp-peak-close{background:transparent;border:none;color:#92400E;font-size:16px;cursor:pointer;line-height:1;padding:0 2px;}
.cp-upgrade-mod{margin-top:10px;padding:10px 12px;background:linear-gradient(135deg,#F0F9FF,#E0F2FE);border-radius:10px;font-size:11px;color:#075985;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.cp-upgrade-mod .cp-upgrade-text{flex:1;min-width:0;}
.cp-modal-list{margin:8px 0 14px;padding:0 0 0 18px;font-size:13px;color:var(--text,#1B2A4E);line-height:1.55;}
.cp-modal-eco{background:#ECFDF5;color:#065F46;padding:8px 10px;border-radius:8px;font-weight:700;font-size:13px;margin-bottom:12px;}
.cp-banner{margin-bottom:10px;padding:8px 12px;border-radius:10px;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;flex-wrap:wrap;}
.cp-banner.warn{background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;}
.cp-banner.danger{background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;}
.cp-banner button{margin-left:auto;background:#fff;border:1px solid currentColor;color:inherit;padding:4px 10px;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;}
.cp-modal-bg{position:fixed;inset:0;background:rgba(15,27,54,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
.cp-modal{background:#fff;border-radius:14px;padding:24px;max-width:380px;width:100%;box-shadow:0 24px 48px rgba(0,0,0,.2);}
.cp-modal h3{font-family:'Fraunces',serif;font-size:20px;margin:0 0 8px;color:var(--primary,#1B2A4E);}
.cp-modal p{font-size:13px;color:var(--text-soft,#5B6B82);margin:0 0 16px;line-height:1.5;}
.cp-modal-actions{display:flex;gap:8px;justify-content:flex-end;}
.cp-modal-actions button{padding:10px 16px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;border:none;}
.cp-modal-actions .ghost{background:#F4F6FB;color:var(--text,#1B2A4E);}
.cp-modal-actions .primary{background:#FF7A45;color:#fff;}
.cp-head{position:relative;}
.cp-toggle{margin-left:auto;background:transparent;border:none;color:var(--text-soft,#5B6B82);font-size:14px;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;}
.cp-toggle:hover{background:#F4F6FB;}
.cp-tabela{margin-top:10px;border:1px solid var(--border,#E4E8F0);border-radius:10px;overflow:hidden;background:#fff;}
.cp-tabela-h{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#F8FAFF;font-size:11px;font-weight:700;color:var(--text-soft,#5B6B82);text-transform:uppercase;letter-spacing:.06em;cursor:pointer;border:none;width:100%;}
.cp-tabela-h:hover{background:#EEF1F8;}
.cp-tabela ul{list-style:none;margin:0;padding:6px 0;}
.cp-tabela li{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;font-size:12px;color:var(--text,#1B2A4E);border-top:1px solid var(--border-soft,#EEF1F6);}
.cp-tabela li:first-child{border-top:none;}
.cp-tabela li .preco{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;color:var(--accent-deep,#E85F2C);white-space:nowrap;margin-left:10px;}
.cp-tabela li .preco.free{color:#059669;}
@media(max-width:760px){
  .cp-card{grid-template-columns:1fr;gap:10px;padding:12px;border-radius:10px;}
  .cp-hist{border-left:none;border-top:1px solid var(--border-soft,#EEF1F6);padding-left:0;padding-top:10px;}
  .cp-saldo{font-size:22px;}
  .cp-totalrow{font-size:10px;}
}
`;

type TabelaItem = { icone: string; nome: string; custo: string; free?: boolean };
const TABELA_CREDITOS: TabelaItem[] = [
  { icone: "💬", nome: "Chat curto (Gemini)", custo: "1 crédito a cada 10 msgs" },
  { icone: "💬", nome: "Geração longa no chat", custo: "5 créditos" },
  { icone: "✍️", nome: "Parecer descritivo", custo: "10 créditos" },
  { icone: "📘", nome: "Plano de aula BNCC", custo: "10 créditos" },
  { icone: "🎗️", nome: "Adaptação PCD", custo: "10 créditos" },
  { icone: "📋", nome: "Anamnese", custo: "10 créditos" },
  { icone: "🎯", nome: "Atividades geradas", custo: "10 créditos" },
  { icone: "🌈", nome: "Atividades PCD", custo: "10 créditos" },
  { icone: "📅", nome: "Planejamento semanal", custo: "15 créditos" },
  { icone: "📊", nome: "Relatório de inclusão", custo: "20 créditos" },
  { icone: "📄", nome: "PEI completo", custo: "50 créditos" },
  { icone: "🗓️", nome: "Trilha semestral", custo: "50 créditos" },
  { icone: "📄", nome: "Exportar PDF / Word", custo: "Grátis 🎁", free: true },
  { icone: "🎁", nome: "Trial (14 dias)", custo: "1000 créditos" },
];

function HistItem({ m }: { m: MovimentacaoCredito }) {
  const pos = m.quantidade >= 0;
  return (
    <li className="cp-hist-item">
      <span className={`cp-hist-q ${pos ? "pos" : "neg"}`}>
        {pos ? "+" : ""}{m.quantidade}
      </span>
      <span className="cp-hist-d" title={m.descricao}>{m.descricao}</span>
    </li>
  );
}

export function CreditosPainel({ onSeeAll }: { onSeeAll?: () => void }) {
  const c = useCreditos();
  const { items } = useHistoricoCreditos(5);
  const [showModal, setShowModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [peakDismissed, setPeakDismissed] = useState(false);
  const [showTabela, setShowTabela] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const pct = c.totais > 0 ? Math.round((c.disponiveis / c.totais) * 100) : 0;
  const cor = corDaBarra(pct);
  const msg = mensagemContextual(pct, c.plano);

  const proxBonus = useMemo(() => {
    if (c.plano !== "anual") return null;
    const p = proximoBonus(new Date());
    if (!p) return null;
    return { mes: MESES_PT_LONGO[p.mes - 1], ano: p.ano };
  }, [c.plano]);

  const escopo =
    c.plano === "anual" ? "no ano letivo"
    : c.plano === "mensal" ? "este mês"
    : "esta semana (grátis)";

  const diasRenov = useMemo(() => diasAteRenovacaoMensal(c.data_renovacao), [c.data_renovacao]);
  const diasRenovSemana = useMemo(() => diasAteRenovacaoSemanal(), [c.data_renovacao]);
  const horasRenovSemana = useMemo(() => horasAteRenovacaoSemanal(), [c.data_renovacao]);
  const mesPico = useMemo(() => isMesPico(), []);
  const mesAtualNome = MESES_PT_LONGO[new Date().getMonth()];

  // dismiss do banner de pico — por mês
  const peakKey = useMemo(() => `cred_peak_dismiss:${new Date().getFullYear()}-${new Date().getMonth() + 1}`, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPeakDismissed(!!window.localStorage.getItem(peakKey));
  }, [peakKey]);
  function dismissPeak() {
    setPeakDismissed(true);
    try { window.localStorage.setItem(peakKey, "1"); } catch {}
  }

  const showBanner = !c.loading && c.totais > 0 && (pct <= 20);
  const bannerLevel: "warn" | "danger" = pct <= 5 ? "danger" : "warn";
  const showPeakBanner = !c.loading && c.plano === "mensal" && mesPico && !peakDismissed;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {showPeakBanner && (
        <div className="cp-peak" role="note">
          <span>📅</span>
          <div className="cp-peak-body">
            <strong>Mês de maior uso pedagógico.</strong> Seus créditos podem acabar antes do previsto.
            <br />
            No <strong>plano anual</strong> você receberia <strong>+500 créditos bônus agora</strong>, além de 19.500 créditos no ano.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setShowUpgrade(true); }}>
              Fazer upgrade para o anual →
            </a>
          </div>
          <button className="cp-peak-close" aria-label="Dispensar aviso" onClick={dismissPeak}>×</button>
        </div>
      )}

      {showBanner && (
        <div className={`cp-banner ${bannerLevel}`} role="alert">
          <span>
            {bannerLevel === "danger"
              ? "🔴 Créditos quase esgotados!"
              : `⚡ Você está com ${pct}% dos créditos restantes.`}
          </span>
          <button onClick={() => setShowModal(true)}>
            {bannerLevel === "danger" ? "Adicionar créditos" : "Ver opções"}
          </button>
        </div>
      )}

      <section className={`cp-card${collapsed ? " collapsed" : ""}`} aria-label="Painel de créditos">
        <div>
          <div className="cp-head">
            <span className="dot" /> ⚡ Seus créditos
            {c.plano === "mensal" && <span style={{ marginLeft: 6, fontWeight: 600, color: "#5B6B82", textTransform: "none", letterSpacing: 0 }}>— Mensal</span>}
            {c.plano === "anual" && <span style={{ marginLeft: 6, fontWeight: 600, color: "#5B6B82", textTransform: "none", letterSpacing: 0 }}>— Anual</span>}
            <button
              className="cp-toggle"
              aria-label={collapsed ? "Expandir painel de créditos" : "Recolher painel de créditos"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? "▸" : "▾"}
            </button>
          </div>
          <div className="cp-saldo">
            {c.loading ? "…" : c.disponiveis.toLocaleString("pt-BR")}
            <small>disponíveis</small>
          </div>
          <div className="cp-totalrow">
            <span>de <strong>{c.totais.toLocaleString("pt-BR")}</strong> {escopo}</span>
            <span><strong>{c.utilizados.toLocaleString("pt-BR")}</strong> utilizados</span>
          </div>
          <div className="cp-bar">
            <div className={`cp-bar-fill ${cor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="cp-pct">
            <span>{pct}% restantes</span>
            <span>{100 - pct}% usados</span>
          </div>

          {!collapsed && (
            <>
              <div className="cp-msg">{msg}</div>

              {proxBonus && (
                <div className="cp-bonus">
                  🎁 Próximo bônus: +500 em {proxBonus.mes}
                </div>
              )}

              {c.plano === "mensal" && (
                <div className="cp-renew">
                  🔄 Renovam em {diasRenov} dia{diasRenov === 1 ? "" : "s"}
                </div>
              )}

              {c.plano === "free" && (
                <div className="cp-renew">
                  🔄 Renovam {diasRenovSemana <= 1
                    ? `em ${horasRenovSemana}h`
                    : `em ${diasRenovSemana} dias`} (sexta às 14h)
                </div>
              )}

              {c.plano === "mensal" && !c.loading && (
                <>
                  <div className="cp-upgrade-mod">
                    <span className="cp-upgrade-text">
                  💡 No plano anual você teria <strong>{CREDITOS_ANUAIS_TOTAL.toLocaleString("pt-BR")} créditos</strong> em janeiro, junho e novembro.
                  Economize <strong>R$ {ECONOMIA_ANUAL.toFixed(2).replace(".", ",")}/ano</strong>.
                    </span>
                    <button className="cp-upgrade-btn" onClick={() => setShowUpgrade(true)}>
                      Ver oferta
                    </button>
                  </div>

                  <div className="cp-compare">
                    <h5>📊 Plano Mensal vs Anual</h5>
                    <div className="cp-compare-row"><span>Mensal</span><strong>1.500/mês</strong></div>
                <div className="cp-compare-row"><span>Anual</span><strong>1.625/mês</strong></div>
                    <div className="cp-compare-eco">Economia: R$ {ECONOMIA_ANUAL.toFixed(2).replace(".", ",")}/ano</div>
                    <button className="cp-compare-cta" onClick={() => setShowUpgrade(true)}>
                      Mudar para anual →
                    </button>
                  </div>
                </>
              )}

              {c.plano === "free" && !c.loading && (
                <div className="cp-upgrade">
                  <span className="cp-upgrade-text">
                    🔒 Plano gratuito: <strong>{FREE_CREDITOS_SEMANAIS} créditos/semana</strong> (renovam toda sexta às 14h, não acumulam).
                    Faça upgrade para ter 18.000 créditos anuais + bônus em janeiro, junho e novembro.
                  </span>
                  <a className="cp-upgrade-btn" href={MP_ANUAL_URL} target="_blank" rel="noopener noreferrer">
                    Ver oferta
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {!collapsed && (
          <div className="cp-hist">
            <h4>📋 {c.plano === "mensal" ? "Este mês" : "Últimas movimentações"}</h4>
            {items.length === 0 ? (
              <p className="cp-hist-empty">Sem movimentações ainda. Use a Sofia para começar!</p>
            ) : (
              <ul className="cp-hist-list">
                {items.map((m) => (<HistItem key={m.id} m={m} />))}
              </ul>
            )}
            {c.plano === "mensal" && c.utilizados > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#5B6B82" }}>
                Total usado: <strong style={{ color: "#1B2A4E" }}>{c.utilizados.toLocaleString("pt-BR")} créditos</strong>
              </div>
            )}
            {onSeeAll && (
              <button className="cp-hist-more" onClick={onSeeAll}>Ver histórico completo →</button>
            )}

            <div className="cp-tabela" aria-label="Tabela de créditos por ação">
              <button
                className="cp-tabela-h"
                onClick={() => setShowTabela((v) => !v)}
                aria-expanded={showTabela}
              >
                <span>📋 Tabela de consumo por ação</span>
                <span>{showTabela ? "▾" : "▸"}</span>
              </button>
              {showTabela && (
                <ul>
                  {TABELA_CREDITOS.map((t) => (
                    <li key={t.nome}>
                      <span><span aria-hidden>{t.icone}</span> {t.nome}</span>
                      <span className={`preco${t.free ? " free" : ""}`}>{t.custo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {showModal && (
        <div className="cp-modal-bg" onClick={() => setShowModal(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚡ Seus créditos por plano</h3>
            <p>
              Cada plano tem sua própria cota de créditos. Veja quanto você recebe:
            </p>
            <ul className="cp-modal-list">
              <li style={{ fontWeight: c.plano === "free" ? 700 : 400 }}>
                🆓 <strong>Gratuito</strong>: {FREE_CREDITOS_SEMANAIS} créditos por semana
                <br /><span style={{ fontSize: 12, color: "#5B6B82" }}>Renovam toda sexta-feira às 14h. Não acumulam.</span>
              </li>
              <li style={{ fontWeight: c.plano === "mensal" ? 700 : 400 }}>
                📅 <strong>Mensal</strong>: 1.500 créditos por mês
                <br /><span style={{ fontSize: 12, color: "#5B6B82" }}>Renovam todo mês na data da assinatura. Não acumulam.</span>
              </li>
              <li style={{ fontWeight: c.plano === "anual" ? 700 : 400 }}>
                🏆 <strong>Anual</strong>: 18.000 créditos por ano
                <br /><span style={{ fontSize: 12, color: "#5B6B82" }}>
                  + 500 créditos bônus em <strong>janeiro</strong>, <strong>junho</strong> e <strong>dezembro</strong> (total 19.500/ano).
                </span>
              </li>
            </ul>
            <p style={{ fontSize: 12, color: "#5B6B82" }}>
              Seu plano atual: <strong>{c.plano === "anual" ? "Anual" : c.plano === "mensal" ? "Mensal" : "Gratuito"}</strong>
              {" — "}{c.disponiveis.toLocaleString("pt-BR")} de {c.totais.toLocaleString("pt-BR")} créditos disponíveis.
            </p>
            <div className="cp-modal-actions">
              <button className="ghost" onClick={() => setShowModal(false)}>Fechar</button>
              {c.plano !== "anual" && (
                <a
                  className="primary"
                  href={MP_ANUAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "10px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                  onClick={() => setShowModal(false)}
                >
                  Ver plano anual →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <div className="cp-modal-bg" onClick={() => setShowUpgrade(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>💡 Mude para o Plano Anual</h3>
            <p>
              Você paga hoje: <strong>R$ {PRECO_MENSAL.toFixed(2).replace(".", ",")}/mês</strong>
              {" "}= <strong>R$ {(PRECO_MENSAL * 12).toFixed(2).replace(".", ",")}/ano</strong>.<br />
              No anual você paga apenas <strong>R$ {PRECO_ANUAL.toFixed(2).replace(".", ",")}/ano</strong>.
            </p>
            <div className="cp-modal-eco">
              🎉 Sua economia: R$ {ECONOMIA_ANUAL.toFixed(2).replace(".", ",")}/ano
            </div>
            <ul className="cp-modal-list">
              <li>+ {CREDITOS_ANUAIS_TOTAL.toLocaleString("pt-BR")} créditos por ano</li>
              <li>+ Bônus de 500 créditos em janeiro, junho e dezembro</li>
              <li>+ Nunca trava nos picos pedagógicos</li>
              <li>+ Créditos já usados no mês são preservados na migração</li>
            </ul>
            <div className="cp-modal-actions">
              <button className="ghost" onClick={() => setShowUpgrade(false)}>Continuar no mensal</button>
              <a
                className="primary"
                href={MP_ANUAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                onClick={() => setShowUpgrade(false)}
              >
                Mudar para anual agora →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}