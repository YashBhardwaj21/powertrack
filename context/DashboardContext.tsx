
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DashboardData, Telemetry, Alert, CommunityStats } from '../types';
import { fetchDashboardData, subscribeToTelemetry } from '../services/dataService';

interface DashboardContextType {
    data: DashboardData | null;
    loading: boolean;
    lastUpdated: string;
    isConnected: boolean;
    error: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const initialData = await fetchDashboardData();
                setData(initialData);
                setLoading(false);
                setIsConnected(true);

                // Start "MQTT" subscription
                const unsubscribe = subscribeToTelemetry((telemetry, alerts, community) => {
                    setData(prev => {
                        if (!prev) return null;
                        // Shallow copy optimization
                        return {
                            ...prev,
                            current_data: telemetry,
                            alerts: alerts,
                            community_stats: community
                        };
                    });
                    setLastUpdated(new Date().toLocaleTimeString());
                });

                return () => {
                    unsubscribe();
                };
            } catch (e) {
                console.error("Failed to initialize dashboard", e);
                setError("Failed to load system data. Please refresh.");
                setLoading(false);
            }
        };

        init();
    }, []);

    return (
        <DashboardContext.Provider value={{ data, loading, lastUpdated, isConnected, error }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
