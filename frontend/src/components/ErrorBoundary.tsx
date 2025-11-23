import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-f1-darker text-white flex items-center justify-center p-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <div className="bg-f1-dark p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Error Details:</h2>
              <pre className="text-sm text-gray-300 overflow-auto">
                {this.state.error?.toString()}
              </pre>
              <pre className="text-xs text-gray-500 mt-4 overflow-auto">
                {this.state.error?.stack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-f1-red text-white rounded-lg hover:bg-red-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
