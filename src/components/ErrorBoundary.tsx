import { Component, type ReactNode } from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Shared fallback UI
// ---------------------------------------------------------------------------

function ErrorUI({
  error,
  title = "Something went wrong",
}: {
  error?: Error | null;
  title?: string;
}) {
  return (
    <div className="page-container flex min-h-screen flex-col items-center justify-center gap-6 py-16 text-center">
      {/* Shopping basket icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-brand-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </div>

      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">
          We hit an unexpected problem. Reload the page to try again, or head
          back to your basket.
        </p>
      </div>

      {/* Error detail — dev only */}
      {import.meta.env.DEV && error && (
        <div className="w-full max-w-lg overflow-auto rounded-lg border border-red-200 bg-red-50 p-4 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
            Dev error detail
          </p>
          <code className="block whitespace-pre-wrap break-all text-xs text-red-800">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </code>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
        <Link to="/basket" className="btn-secondary">
          Go to basket
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Class component — the only way to catch render errors in React
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production you'd forward this to your error-tracking service
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Caught render error:", error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return <ErrorUI error={this.state.error} />;
    }
    return <>{this.props.children}</>;
  }
}

// ---------------------------------------------------------------------------
// HOC helper
// ---------------------------------------------------------------------------

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName ?? WrappedComponent.name ?? "Component";

  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

// ---------------------------------------------------------------------------
// RouteErrorBoundary — drop-in for react-router <Route errorElement={...} />
// ---------------------------------------------------------------------------

export function RouteErrorBoundary() {
  const routeError = useRouteError();

  let title = "Something went wrong";
  let syntheticError: Error | null = null;

  if (isRouteErrorResponse(routeError)) {
    if (routeError.status === 404) {
      title = "Page not found";
    } else if (routeError.status === 403) {
      title = "Access denied";
    } else {
      title = `Error ${routeError.status}`;
    }
    syntheticError = new Error(
      typeof routeError.data === "string"
        ? routeError.data
        : JSON.stringify(routeError.data),
    );
  } else if (routeError instanceof Error) {
    syntheticError = routeError;
  } else if (typeof routeError === "string") {
    syntheticError = new Error(routeError);
  }

  return <ErrorUI error={syntheticError} title={title} />;
}

export default ErrorBoundary;
