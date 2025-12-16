
import { DashboardData, Telemetry, Alert, CommunityStats } from '../types';
import { initializeSimulation, tickSimulation } from './dataGenerator';
import { getDashboardState, saveDashboardState } from './db';

// In-memory simulation state
let appData: DashboardData | null = null;
let saveInterval: any = null;

export const fetchDashboardData = async (): Promise<DashboardData> => {
    if (appData) return appData;

    try {
        // 1. Try to load from IndexedDB
        const storedData = await getDashboardState();
        
        if (storedData) {
            console.log("Loaded data from persistence layer.");
            // Rehydrate timestamps to Dates if necessary (JSON serialization usually strings them)
            // For this app, strings are fine as per types interface
            appData = storedData;
        } else {
            console.log("No persisted data found. Generating fresh simulation...");
            appData = initializeSimulation();
            // Save immediately so reload works
            await saveDashboardState(appData);
        }
    } catch (err) {
        console.error("DB Error, falling back to generator", err);
        appData = initializeSimulation();
    }

    return appData!;
};

// Polling simulation to mimic MQTT subscription
export const subscribeToTelemetry = (
    onData: (data: Telemetry[], alerts: Alert[], community: CommunityStats) => void
) => {
    const interval = setInterval(() => {
        if (appData) {
            const { telemetry, alerts, community } = tickSimulation(appData.schools);
            appData.current_data = telemetry;
            appData.alerts = alerts;
            appData.community_stats = community;
            
            // Pass data back to UI
            onData(telemetry, alerts, community);
        }
    }, 2000); 

    // Persist to DB every 30 seconds to avoid slamming disk IO
    if (!saveInterval) {
        saveInterval = setInterval(() => {
            if (appData) {
                saveDashboardState(appData).catch(console.error);
            }
        }, 30000);
    }

    return () => {
        clearInterval(interval);
        if (saveInterval) clearInterval(saveInterval);
    };
};
