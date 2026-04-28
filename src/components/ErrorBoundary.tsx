import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-full w-full items-center justify-center bg-black/50 p-4 text-center text-white backdrop-blur-md">
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
            <h2 className="mb-2 text-xl font-bold text-red-500">Ops! Algo deu errado.</h2>
            <p className="text-sm text-white/70">O componente falhou ao carregar, mas o restante do app continua funcionando.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded bg-red-500 px-4 py-2 text-sm font-bold transition-colors hover:bg-red-600"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
