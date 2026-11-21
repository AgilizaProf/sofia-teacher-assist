import { Component, type ErrorInfo, type ReactNode } from "react";
import { PencilLogo, painelTokensCss } from "@/components/painel/PainelNav";

/* ------------------------------------------------------------------
 * Tela de status no visual Painel: 404, erro e "entrando…".
 * Usada pelo __root (404 e erro), pelo router (erro padrão), pelo
 * retorno do login (auth/callback) e por este ErrorBoundary.
 * ------------------------------------------------------------------ */

const statusCss = `
.pn-status{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;}
.pn-status-card{width:100%;max-width:440px;background:var(--pn-surface);border:2px solid var(--pn-ink);
  border-radius:20px;box-shadow:5px 5px 0 var(--pn-ink);padding:28px 24px;text-align:center;}
.pn-status-brand{display:inline-flex;align-items:center;gap:10px;font-family:var(--pn-display);font-weight:800;
  font-size:24px;letter-spacing:-.04em;color:var(--pn-ink);text-decoration:none;}
.pn-status-brand b{color:var(--pn-green);font-weight:800;}
.pn-status-code{margin:22px 0 4px;font-family:var(--pn-display);font-weight:800;font-size:56px;line-height:1;color:var(--pn-coral);}
.pn-status h1{margin:14px 0 6px;font-family:var(--pn-display);font-weight:700;font-size:22px;line-height:1.25;color:var(--pn-ink);}
.pn-status p{margin:0;font-size:15px;line-height:1.5;color:var(--pn-muted);}
.pn-status-actions{margin-top:22px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;}
.pn-status-spin{margin:22px auto 0;width:32px;height:32px;border:3px solid var(--pn-green-soft);
  border-top-color:var(--pn-green);border-radius:50%;animation:pn-status-spin .9s linear infinite;}
.pn-status pre{margin:16px 0 0;max-height:160px;overflow:auto;text-align:left;font-size:12px;background:var(--pn-bg);
  border:1px solid var(--pn-line);border-radius:10px;padding:10px;color:var(--pn-coral);white-space:pre-wrap;}
@keyframes pn-status-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion: reduce){.pn-status-spin{animation-duration:2.4s;}}
`;

export type TelaStatusAcao = {
  label: string;
  href?: string;
  onClick?: () => void;
  primaria?: boolean;
};

export function TelaStatus({
  codigo,
  titulo,
  texto,
  acoes = [],
  carregando = false,
  detalhe,
}: {
  codigo?: string;
  titulo: string;
  texto?: string;
  acoes?: TelaStatusAcao[];
  carregando?: boolean;
  detalhe?: string;
}) {
  return (
    <div className="pn">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + statusCss }} />
      <main className="pn-status">
        <div className="pn-status-card" role={carregando ? "status" : undefined} aria-live="polite">
          <a className="pn-status-brand" href="/" aria-label="AgilizaProf, página inicial">
            <PencilLogo size={40} />
            <span>
              Agiliza<b>Prof</b>
            </span>
          </a>
          {codigo && <div className="pn-status-code">{codigo}</div>}
          <h1>{titulo}</h1>
          {texto && <p>{texto}</p>}
          {carregando && <div className="pn-status-spin" aria-hidden="true" />}
          {detalhe && <pre>{detalhe}</pre>}
          {acoes.length > 0 && (
            <div className="pn-status-actions">
              {acoes.map((a) =>
                a.href ? (
                  <a
                    key={a.label}
                    href={a.href}
                    className={`pn-btn${a.primaria ? " primary" : ""}`}
                  >
                    {a.label}
                  </a>
                ) : (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.onClick}
                    className={`pn-btn${a.primaria ? " primary" : ""}`}
                  >
                    {a.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function PaginaNaoEncontrada() {
  return (
    <TelaStatus
      codigo="404"
      titulo="Página não encontrada"
      texto="Este endereço não existe ou mudou de lugar. Confira o link ou volte ao início."
      acoes={[{ label: "Voltar ao início", href: "/", primaria: true }]}
    />
  );
}

export function TelaErro({ onRetry }: { onRetry?: () => void }) {
  const tentar =
    onRetry ??
    (() => {
      if (typeof window !== "undefined") window.location.reload();
    });
  return (
    <TelaStatus
      titulo="Algo deu errado"
      texto="Tivemos um problema ao abrir esta tela. Tente de novo em instantes."
      acoes={[
        { label: "Tentar de novo", onClick: tentar, primaria: true },
        { label: "Voltar ao início", href: "/" },
      ]}
    />
  );
}

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * ErrorBoundary global do app. Garante que qualquer falha de renderização
 * mostre uma mensagem amigável em vez do JSON cru `{"unhandled":true,...}`.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RootErrorBoundary]", error, info?.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <TelaErro onRetry={this.reset} />;
  }
}

export default RootErrorBoundary;
