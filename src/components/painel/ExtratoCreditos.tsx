import { useEffect, useMemo, useState } from "react";
import {
  useAssinatura,
  useHistoricoCreditos,
  type CreditosState,
} from "@/lib/creditos/useCreditos";
import {
  PROMO_ATE_TEXTO,
  TABELA_CUSTOS,
  categoriaDoLancamento,
  custoTexto,
} from "@/lib/creditos/policy";

// Extrato de créditos no visual Painel: abre ao tocar nos créditos do Início.
// Lançamentos reais da tabela creditos_historico (RLS: só os da professora).
// Valores da tabela "quanto custa" vêm de CUSTOS (policy.ts), a fonte única.

const LIMITE = 200;

const css = `
.xc-bg{position:fixed;inset:0;z-index:80;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.xc{width:100%;max-width:620px;max-height:90vh;overflow:auto;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:6px 6px 0 var(--pn-ink);padding:20px;font-family:var(--pn-body);color:var(--pn-ink);}
.xc-h{display:flex;align-items:flex-start;gap:12px;}
.xc-h h2{margin:0;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.xc-h p{margin:4px 0 0;color:var(--pn-muted);font-size:14px;}
.xc-x{margin-left:auto;width:38px;height:38px;border-radius:10px;border:2px solid var(--pn-ink);background:#fff;font-size:18px;font-weight:700;cursor:pointer;flex:none;color:var(--pn-ink);}
.xc-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:16px 0 4px;flex-wrap:wrap;}
.xc-saldo{font-family:var(--pn-display);font-weight:800;font-size:32px;letter-spacing:-.04em;line-height:1;}
.xc-saldo small{display:block;margin-top:4px;font-family:var(--pn-body);font-size:13px;font-weight:600;color:var(--pn-muted);letter-spacing:0;}
.xc-bar{height:10px;border-radius:5px;background:var(--pn-bg);overflow:hidden;margin-top:10px;width:220px;max-width:100%;}
.xc-bar span{display:block;height:100%;background:var(--pn-green);}
.xc-usado{text-align:right;}
.xc-usado b{font-family:var(--pn-display);font-size:20px;}
.xc-usado span{display:block;color:var(--pn-muted);font-size:13px;}
.xc-tabs{display:flex;gap:6px;margin:16px 0 12px;flex-wrap:wrap;}
.xc-tabs button{height:36px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-weight:700;font-size:14px;color:var(--pn-ink);cursor:pointer;}
.xc-tabs button[aria-pressed="true"]{background:var(--pn-ink);border-color:var(--pn-ink);color:#fff;}
.xc-cat{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-top:1.5px solid var(--pn-line);}
.xc-cat:first-child{border-top:0;}
.xc-cat b{font-size:15px;}
.xc-cat .q{font-family:var(--pn-display);font-weight:700;font-variant-numeric:tabular-nums;}
.xc-cat .tr{grid-column:1/-1;height:8px;border-radius:4px;background:var(--pn-bg);overflow:hidden;}
.xc-cat .tr span{display:block;height:100%;background:var(--pn-sun);}
.xc-cat small{grid-column:1/-1;color:var(--pn-muted);font-size:13px;}
.xc-mv{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1.5px solid var(--pn-line);}
.xc-mv:first-child{border-top:0;}
.xc-mv time{font-size:13px;font-weight:700;color:var(--pn-muted);font-variant-numeric:tabular-nums;}
.xc-mv b{display:block;font-size:14.5px;}
.xc-mv small{display:block;color:var(--pn-muted);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xc-mv span{min-width:0;}
.xc-mv .q{font-family:var(--pn-display);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;}
.xc-mv .q.neg{color:#B42318;}
.xc-mv .q.pos{color:var(--pn-green);}
.xc-tab{width:100%;border-collapse:collapse;font-size:14.5px;}
.xc-tab td{padding:9px 0;border-top:1.5px solid var(--pn-line);vertical-align:top;}
.xc-tab tr:first-child td{border-top:0;}
.xc-tab td:last-child{text-align:right;font-weight:700;white-space:nowrap;padding-left:12px;}
.xc-tab .obs{color:var(--pn-muted);font-size:12.5px;}
.xc-empty{padding:18px;border:1.5px dashed var(--pn-line);border-radius:14px;color:var(--pn-muted);font-size:14px;text-align:center;}
.xc-note{margin:14px 0 0;color:var(--pn-muted);font-size:13px;line-height:1.45;}
@media (max-width:520px){.xc{padding:16px;border-radius:16px;}.xc-saldo{font-size:28px;}.xc-usado{text-align:left;}}
`;

type Aba = "tipo" | "extrato" | "valores";

function fmt(n: number) {
  return Number(n).toLocaleString("pt-BR");
}

function diaMes(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function ExtratoCreditos({ cred, onClose }: { cred: CreditosState; onClose: () => void }) {
  const [aba, setAba] = useState<Aba>("tipo");
  const { items, loading } = useHistoricoCreditos(LIMITE);
  const assinatura = useAssinatura();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pct = cred.totais > 0 ? Math.round((cred.disponiveis / cred.totais) * 100) : 0;
  const unidade = useMemo(() => {
    const m = new Map<string, (typeof TABELA_CUSTOS)[number]>();
    TABELA_CUSTOS.forEach((t) => m.set(t.nome, t));
    return m;
  }, []);

  const porTipo = useMemo(() => {
    const by = new Map<string, { q: number; n: number }>();
    items
      .filter((m) => m.quantidade < 0)
      .forEach((m) => {
        const cat = categoriaDoLancamento(m.descricao, m.tipo);
        const cur = by.get(cat) ?? { q: 0, n: 0 };
        cur.q += -m.quantidade;
        cur.n += 1;
        by.set(cat, cur);
      });
    return [...by.entries()].sort((a, b) => b[1].q - a[1].q);
  }, [items]);
  const max = porTipo.length ? porTipo[0][1].q : 1;

  const planoTexto = assinatura.cortesia
    ? `Grátis até ${PROMO_ATE_TEXTO} · ${fmt(cred.totais)} créditos por mês`
    : cred.plano === "anual"
      ? `Plano anual · ${fmt(cred.totais)} créditos no ano`
      : cred.plano === "mensal"
        ? `Plano mensal · ${fmt(cred.totais)} créditos por mês`
        : `Plano gratuito · ${fmt(cred.totais)} créditos por semana`;
  const escopo =
    cred.plano === "anual" ? "no ano" : cred.plano === "mensal" ? "neste ciclo" : "nesta semana";

  return (
    <div className="xc-bg" onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className="xc"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xc-h"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="xc-h">
          <div>
            <h2 id="xc-h">Seus créditos</h2>
            <p>{planoTexto}</p>
          </div>
          <button type="button" className="xc-x" aria-label="Fechar" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="xc-top">
          <div>
            <div className="xc-saldo">
              {fmt(cred.disponiveis)}
              <small>de {fmt(cred.totais)} disponíveis</small>
            </div>
            <div className="xc-bar" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="xc-usado">
            <b>{fmt(cred.utilizados)}</b>
            <span>usados {escopo}</span>
          </div>
        </div>

        <div className="xc-tabs" role="group" aria-label="Ver por">
          {(
            [
              ["tipo", "Por tipo"],
              ["extrato", "Extrato"],
              ["valores", "Quanto custa cada coisa"],
            ] as Array<[Aba, string]>
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={aba === k} onClick={() => setAba(k)}>
              {l}
            </button>
          ))}
        </div>

        {aba === "tipo" &&
          (loading ? (
            <div className="xc-empty">Carregando…</div>
          ) : porTipo.length === 0 ? (
            <div className="xc-empty">Nenhum crédito gasto ainda.</div>
          ) : (
            <div>
              {porTipo.map(([cat, v]) => {
                const u = unidade.get(cat);
                return (
                  <div className="xc-cat" key={cat}>
                    <b>{cat}</b>
                    <span className="q">{fmt(v.q)}</span>
                    <span className="tr" aria-hidden>
                      <span style={{ width: `${Math.round((v.q / max) * 100)}%` }} />
                    </span>
                    <small>
                      {v.n} {v.n === 1 ? "vez" : "vezes"}
                      {u ? ` · ${custoTexto(u.custo)} cada${u.obs ? ` ${u.obs}` : ""}` : ""}
                    </small>
                  </div>
                );
              })}
            </div>
          ))}

        {aba === "extrato" &&
          (loading ? (
            <div className="xc-empty">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="xc-empty">Ainda não há lançamentos.</div>
          ) : (
            <div>
              {items.map((m) => (
                <div className="xc-mv" key={m.id}>
                  <time dateTime={m.created_at}>{diaMes(m.created_at)}</time>
                  <span>
                    <b>{categoriaDoLancamento(m.descricao, m.tipo)}</b>
                    <small title={m.descricao}>{m.descricao}</small>
                  </span>
                  <span className={"q " + (m.quantidade < 0 ? "neg" : "pos")}>
                    {m.quantidade > 0 ? "+" : "−"}
                    {fmt(Math.abs(m.quantidade))}
                  </span>
                </div>
              ))}
            </div>
          ))}

        {aba === "valores" && (
          <table className="xc-tab">
            <tbody>
              {TABELA_CUSTOS.map((t) => (
                <tr key={t.nome}>
                  <td>
                    {t.nome}
                    {t.obs && <div className="obs">{t.obs}</div>}
                  </td>
                  <td>{custoTexto(t.custo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="xc-note">
          {aba === "extrato" && items.length >= LIMITE
            ? `Mostrando os últimos ${LIMITE} lançamentos. `
            : ""}
          Os valores são os que o app cobra hoje. Baixar em PDF ou Word não gasta créditos.
        </p>
      </div>
    </div>
  );
}
