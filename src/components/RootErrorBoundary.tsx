import { Component, type ErrorInfo, type ReactNode } from "react";

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">Ops! Algo deu errado.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tivemos um problema ao carregar esta tela. Tente novamente em alguns instantes.
          </p>
          <button
            onClick={this.reset}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;