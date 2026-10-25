import * as React from "react";

import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Graphique en échec :", error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          className={cn("min-h-64", this.props.className)}
          title={this.props.title ?? "Graphique indisponible"}
          description="Les données du graphique n'ont pas pu être affichées. Le reste de la page fonctionne normalement."
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
