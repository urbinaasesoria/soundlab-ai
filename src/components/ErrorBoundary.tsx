import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { BRAND } from "../lib/brand";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Red de seguridad global: evita que un fallo en un componente deje la
 * aplicación en blanco. Ofrece recuperación sin perder el almacenamiento local.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Punto de integración para Sentry/telemetría en producción.
    console.error("[URBINA] Error no controlado:", error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetData = () => {
    try {
      localStorage.clear();
    } catch {
      /* almacenamiento bloqueado */
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="boot boot--error" role="alert">
        <div className="boot__word">{BRAND.wordmark}</div>
        <div className="boot__sub">{BRAND.sub}</div>
        <div className="callout callout--danger boot__error">
          <AlertTriangle size={18} />
          <div>
            <b>Algo se ha roto en la interfaz</b>
            <p>{error.message || "Error desconocido"}</p>
          </div>
        </div>
        <p className="boot__text">
          Tu audio y tus análisis siguen guardados en este navegador. Recarga para continuar; si el problema se
          repite, puedes reiniciar los datos locales.
        </p>
        <div className="row-flex">
          <button className="btn btn--primary" onClick={this.reload}>
            <RotateCcw size={14} /> Recargar
          </button>
          <button className="btn btn--ghost" onClick={this.resetData}>
            Reiniciar datos locales
          </button>
        </div>
        <p className="boot__legal">{BRAND.copyright}</p>
      </div>
    );
  }
}
