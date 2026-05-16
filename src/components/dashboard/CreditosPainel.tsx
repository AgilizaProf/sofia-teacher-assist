import { useMemo, useState } from "react";
import { useCreditos, useHistoricoCreditos, type MovimentacaoCredito } from "@/lib/creditos/useCreditos";
import { corDaBarra, mensagemContextual, MESES_PT_LONGO, proximoBonus } from "@/lib/creditos/policy";

const css = `
.cp-card{background:#fff;border:1px solid var(--border, #E4E8F0);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow-sm, 0 1px 2px rgba(27,42,78,.05));display:grid;grid-template-columns:1.4fr 1fr;gap:24px;margin-bottom:18px;}
.cp-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--text-soft, #5B6B82);text-transform:uppercase;letter-spacing:.08em;}
.cp-head .dot{width:8px;height:8px;border-radius:50%;background:var(--accent, #FF7A45);}
.cp-saldo{font-family:'Fraunces',serif;font-weight:800;font-size:38px;line-height:1.05;color:var(--primary,#1B2A4E);letter-spacing:-0.02em;margin-top:10px;}
.cp-saldo small{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--text-soft,#5B6B82);margin-left:8px;}
.cp-totalrow{display:flex;gap:18px;margin-top:6px;font-size:13px;color:var(--text-soft,#5B6B82);}
.cp-totalrow strong{color:var(--text,#1B2A4E);font-weight:700;}
.cp-bar{height:10px;border-radius:999px;background:#EEF1F8;overflow:hidden;margin-top:14px;}
.cp-bar-fill{height:100%;border-radius:999px;transition:width .35s ease;}
.cp-bar-fill.ok{background:linear-gradient(90deg,#10B981,#34D399);}
.cp-bar-fill.warn{background:linear-gradient(90deg,#F59E0B,#FBBF24);}
.cp-bar-fill.danger{background:linear-gradient(90deg,#EF4444,#F87171);}
.cp-pct{display:flex;justify-content:space-between;font-size:12px;color:var(--text-soft,#5B6B82);margin-top:6px;}
.cp-msg{margin-top:12px;font-size:13px;color:var(--text,#1B2A4E);}
.cp-bonus{margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:var(--accent-soft,#FFF1E8);color:var(--accent-deep,#E85F2C);padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;}
.cp-hist{border-left:1px solid var(--border-soft,#EEF1F6);padding-left:18px;display:flex;flex-direction:column;}
.cp-hist h4{font-size:12px;font-weight:800;color:var(--text-soft,#5B6B82);text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;}
.cp-hist-empty{color:var(--text-muted,#8A98AE);font-size:13px;}
.cp-hist-list{display:flex;flex-direction:column;gap:8px;flex:1;}
.cp-hist-item{display:flex;align-items:center;justify-content:space-between;font-size:13px;}
.cp-hist-q{font-weight:700;font-family:'JetBrains Mono',monospace;font-size:12px;}
.cp-hist-q.pos{color:#10B981;}
.cp-hist-q.neg{color:#EF4444;}
.cp-hist-d{color:var(--text,#1B2A4E);flex:1;margin:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cp-hist-more{margin-top:10px;font-size:12px;color:var(--accent-deep,#E85F2C);font-weight:700;background:none;border:none;padding:0;text-align:left;cursor:pointer;}
.cp-upgrade{margin-top:12px;padding:10px 12px;background:linear-gradient(135deg,#FFF1E8,#FFE4D1);border-radius:10px;font-size:12px;color:var(--accent-deep,#E85F2C);font-weight:600;}
.cp-banner{margin-bottom:12px;padding:12px 16px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;}
.cp-banner.warn{background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;}
.cp-banner.danger{background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;}
.cp-banner button{margin-left:auto;background:#fff;border:1px solid currentColor;color:inherit;padding:6px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;}
.cp-modal-bg{position:fixed;inset:0;background:rgba(15,27,54,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
.cp-modal{background:#fff;border-radius:14px;padding:24px;max-width:380px;width:100%;box-shadow:0 24px 48px rgba(0,0,0,.2);}
.cp-modal h3{font-family:'Fraunces',serif;font-size:20px;margin:0 0 8px;color:var(--primary,#1B2A4E);}
.cp-modal p{font-size:13px;color:var(--text-soft,#5B6B82);margin:0 0 16px;line-height:1.5;}
.cp-modal-actions{display:flex;gap:8px;justify-content:flex-end;}
.cp-modal-actions button{padding:10px 16px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;border:none;}
.cp-modal-actions .ghost{background:#F4F6FB;color:var(--text,#1B2A4E);}
.cp-modal-actions .primary{background:var(--accent,#FF7A45);color:#fff;}
@media(max-width:760px){
  .cp-card{grid-template-columns:1fr;gap:14px;padding:16px;}
  .cp-hist{border-left:none;border-top:1px solid var(--border-soft,#EEF1F6);padding-left:0;padding-top:14px;}
  .cp-saldo{font-size:30px;}
}
`;

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

  const pct = c.totais > 0 ? Math.round((c.disponiveis / c.totais) * 100) : 0;
  const cor = corDaBarra(pct);
  const msg = mensagemContextual(pct);

  const proxBonus = useMemo(() => {
    if (c.plano !== "anual") return null;
    const p = proximoBonus(new Date());
    if (!p) return null;
    return { mes: MESES_PT_LONGO[p.mes - 1], ano: p.ano };
  }, [c.plano]);

  const escopo = c.plano === "anual" ? "no ano letivo" : c.plano === "mensal" ? "este mês" : "este mês (grátis)";

  const showBanner = !c.loading && c.totais > 0 && (pct <= 20);
  const bannerLevel: "warn" | "danger" = pct <= 5 ? "danger" : "warn";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

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

      <section className="cp-card" aria-label="Painel de créditos">
        <div>
          <div className="cp-head">
            <span className="dot" /> ⚡ Seus créditos
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
          <div className="cp-msg">{msg}</div>

          {proxBonus && (
            <div className="cp-bonus">
              🎁 Próximo bônus: +500 em {proxBonus.mes}
            </div>
          )}

          {c.plano === "free" && !c.loading && (
            <div className="cp-upgrade">
              🔒 Upgrade para ter 19.500 créditos anuais + bônus em janeiro, junho e novembro.
            </div>
          )}
        </div>

        <div className="cp-hist">
          <h4>📋 Últimas movimentações</h4>
          {items.length === 0 ? (
            <p className="cp-hist-empty">Sem movimentações ainda. Use a Sofia para começar!</p>
          ) : (
            <ul className="cp-hist-list">
              {items.map((m) => (<HistItem key={m.id} m={m} />))}
            </ul>
          )}
          {onSeeAll && (
            <button className="cp-hist-more" onClick={onSeeAll}>Ver histórico completo →</button>
          )}
        </div>
      </section>

      {showModal && (
        <div className="cp-modal-bg" onClick={() => setShowModal(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Adicionar créditos extras</h3>
            <p>
              Que tal um reforço? Por <strong>R$ 9,90</strong> você adiciona
              <strong> +500 créditos</strong> imediatamente à sua conta — o suficiente
              para 5 pareceres, 5 planos de aula ou 2 PEIs completos + 1 anamnese.
            </p>
            <div className="cp-modal-actions">
              <button className="ghost" onClick={() => setShowModal(false)}>Agora não</button>
              <button className="primary" onClick={() => { setShowModal(false); }}>
                Em breve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}