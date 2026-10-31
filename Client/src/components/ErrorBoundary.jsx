import React from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('🚨 [CAPISÈ REACT ERROR BOUNDARY CAUGHT]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyDetails = () => {
    const details = `Error: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 sm:p-6 text-center select-none">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-5 animate-in fade-in-50 duration-300">
            {/* Warning Badge */}
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Interface Recovery Mode
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed">
                An unexpected interface issue occurred. Your financial records and database balances are safe and uncorrupted.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Application
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </button>
            </div>

            {/* Diagnostic Details */}
            {this.state.error && (
              <div className="pt-3 border-t border-gray-100 text-left">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Diagnostic Trace
                  </span>
                  <button
                    onClick={this.handleCopyDetails}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer font-medium"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" /> Copy Details
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-gray-600 bg-gray-50 p-2.5 rounded-lg overflow-x-auto max-h-32 border border-gray-200">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

