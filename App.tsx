import React, { Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { SchoolsPage } from './pages/Schools';
import { AnalyticsPage } from './pages/Analytics';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// Simple Error Boundary to catch render crashes
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md w-full text-center">
                        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">System Error</h2>
                        <p className="text-slate-500 mb-4">The dashboard encountered a critical error and could not render.</p>
                        <div className="bg-slate-900 text-slate-300 p-3 rounded text-left text-xs font-mono overflow-auto mb-6">
                            {this.state.error?.message}
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const AppContent: React.FC = () => {
    const { loading } = useDashboard();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-white font-medium text-lg">Connecting to Telemetry Stream...</h2>
                    <p className="text-slate-400 text-sm mt-2">Initializing Database & Authenticating (TLS)</p>
                </div>
            </div>
        );
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/schools" element={<SchoolsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <HashRouter>
                <DashboardProvider>
                    <AppContent />
                </DashboardProvider>
            </HashRouter>
        </ErrorBoundary>
    );
};

export default App;