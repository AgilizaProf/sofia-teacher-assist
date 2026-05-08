import { Component, type ErrorInfo, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Texto curto identificando a área (ex.: "card de adaptações"). */
  area?: string;
  /** Quando true, esconde totalmente em caso de erro em vez de mostrar fallback. */
  silent?: boolean;
};

type State = { hasError: boolean; message?: string };

/**
 * Error Boundary específico para componentes da Sofia.
 * Garante que qualquer falha em widgets/cards/sugestões da Sofia
 * não derrube a página inteira — exibe um fallback amigável.
 */
export class SofiaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Mantém visibilidade no console para diagnóstico, sem quebrar a UI.
    console.error(`[SofiaErrorBoundary${this.props.area ? ` · ${this.props.area}` : ""}]`, error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.silent) return null;

    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: "linear-gradient(135deg,#1E1B2E 0%,#15131F 100%)",
          border: "1px solid #2A2438",
          borderRadius: 16,
          padding: "16px 18px",
          color: "#fff",
          fontFamily: "'Inter',-apple-system,sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 14px 36px rgba(15,13,30,.28)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#8B5CF6,#6D28D9)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 0 0 3px rgba(139,92,246,.18)",
          }}
        >
          <Sparkles size={16} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C4B5FD", marginBottom: 2 }}>
            Sofia está se reorganizando
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.75)", lineHeight: 1.4 }}>
            Não foi possível carregar {this.props.area ?? "esta sugestão"} agora. O resto da página segue funcionando normalmente.
          </div>
        </div>
        <button
          onClick={this.reset}
          style={{
            border: 0,
            background: "rgba(255,255,255,.1)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            padding: "8px 12px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}

export default SofiaErrorBoundary;