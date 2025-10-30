// FIX: Changed import style to resolve a subtle type issue where 'props' was not found on the component instance.
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-gray-800 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Oops! Something went wrong.</h1>
            <p className="text-gray-300 mb-6">A component has crashed. Please try refreshing the page.</p>
            <details className="w-full max-w-lg bg-gray-900 rounded p-4 text-left text-xs text-red-300">
                <summary className="cursor-pointer font-semibold">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error?.toString()}
                </pre>
            </details>
            <button
                onClick={() => window.location.reload()}
                className="mt-6 px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600"
            >
                Refresh Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
