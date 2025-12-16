
import { DashboardData, School, Telemetry, HistoricalData, WeatherCondition, FaultType, Alert, StorageStats, ModelMetrics, FinancialStats, CommunityStats } from '../types';
import { SCHOOL_CONFIGS, INITIAL_METADATA, BANDUNG_CENTER, SIMULATION_CONFIG, FAULT_LABELS, ALERT_THRESHOLDS } from '../constants';

const WEATHER_OPTS: WeatherCondition[] = ["sunny", "partly_cloudy", "cloudy", "rainy"];

// --- Helper Functions ---

const getWeightedWeather = (month: number): WeatherCondition => {
    // West Java Seasonality
    const isDrySeason = month >= 4 && month <= 8;
    const r = Math.random();
    const weights = isDrySeason ? [0.4, 0.4, 0.15, 0.05] : [0.1, 0.3, 0.4, 0.2]; 

    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
        if (r < sum) return WEATHER_OPTS[i];
    }
    return 'partly_cloudy';
};

const getRandomCoord = (base: number) => base + (Math.random() - 0.5) * 0.06;

const generateSchools = (): School[] => {
    return SCHOOL_CONFIGS.map(cfg => ({
        school_id: cfg.id,
        name: cfg.name,
        type: cfg.type,
        address: cfg.address,
        district: cfg.district,
        coordinates: {
            lat: getRandomCoord(BANDUNG_CENTER.lat),
            lng: getRandomCoord(BANDUNG_CENTER.lng)
        },
        principal_name: "Principal Name", 
        contact_email: `admin@${cfg.id.toLowerCase()}.sch.id`,
        student_count: Math.floor(Math.random() * 800) + 200,
        total_capacity_kwp: cfg.capacity,
        installation_date: "2023-01-15"
    }));
};

// --- Historical Data Generation ---
const generateHistoricalData = (schools: School[]): { history: HistoricalData[], metrics: ModelMetrics } => {
    const history: HistoricalData[] = [];
    const today = new Date();
    
    const allResiduals: number[] = [];
    const allActuals: number[] = [];
    const allPercentageErrors: number[] = [];
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (let day = 365; day > 0; day--) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        const dateStr = date.toISOString().split('T')[0];
        const month = date.getMonth(); 
        const baseWeather = getWeightedWeather(month);

        schools.forEach(school => {
            let weather = baseWeather;
            if (Math.random() > 0.7) weather = getWeightedWeather(month);

            const baselineIrrFactor = SIMULATION_CONFIG.irradiance_factors[weather];
            const baselineSunHours = SIMULATION_CONFIG.base_sun_hours * baselineIrrFactor;
            const baselinePR = 0.80; 
            const predictedEnergy = Number((school.total_capacity_kwp * baselineSunHours * baselinePR).toFixed(2));

            let actualIrrFactor = baselineIrrFactor * (0.9 + Math.random() * 0.2);
            const seasonalTempFactor = (month >= 4 && month <= 8) ? -0.02 : 0.01; 
            let actualPR = 0.75 + seasonalTempFactor + Math.random() * 0.08; 

            let isFaulty = false;
            if (Math.random() < 0.02) {
                 actualPR *= 0.6; 
                 isFaulty = true;
            }

            const actualEnergy = Number((school.total_capacity_kwp * baselineSunHours * actualIrrFactor * (actualPR/0.8)).toFixed(2));
            const peakPower = Number((school.total_capacity_kwp * actualIrrFactor * SIMULATION_CONFIG.inverter_efficiency).toFixed(2));
            const savings = Math.floor(actualEnergy * INITIAL_METADATA.electricity_rate_idr);
            const co2 = Number((actualEnergy * INITIAL_METADATA.carbon_intensity_kg_per_kwh).toFixed(2));
            
            const residual = predictedEnergy - actualEnergy;
            const absResidual = Math.abs(residual);
            const percentageError = actualEnergy > 0 ? absResidual / actualEnergy : 0;
            
            allResiduals.push(absResidual);
            allActuals.push(actualEnergy);
            if (actualEnergy > 0) allPercentageErrors.push(percentageError);

            const modelFlaggedAnomaly = absResidual > (predictedEnergy * 0.25);
            const actualAnomaly = isFaulty || actualPR < 0.70;

            if (modelFlaggedAnomaly && actualAnomaly) truePositives++;
            else if (modelFlaggedAnomaly && !actualAnomaly) falsePositives++;
            else if (!modelFlaggedAnomaly && actualAnomaly) falseNegatives++;

            history.push({
                record_id: `${school.school_id}_${dateStr}`,
                school_id: school.school_id,
                date: dateStr,
                total_energy_kwh: actualEnergy,
                predicted_energy_kwh: predictedEnergy,
                peak_power_kw: peakPower,
                performance_ratio: Number((actualPR * 100).toFixed(1)),
                capacity_utilization: Number(((actualEnergy / (school.total_capacity_kwp * 24)) * 100).toFixed(1)),
                weather_condition: weather,
                savings_idr: savings,
                co2_saved_kg: co2,
                anomaly_count: actualAnomaly ? 1 : 0
            });
        });
    }

    const n = allResiduals.length;
    const mad = allResiduals.reduce((a, b) => a + b, 0) / n;
    const mape = (allPercentageErrors.reduce((a, b) => a + b, 0) / allPercentageErrors.length) * 100;
    const mse = allResiduals.reduce((a, b) => a + (b * b), 0) / n;
    const rmse = Math.sqrt(mse);

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * ((precision * recall) / (precision + recall)) || 0;

    const metrics: ModelMetrics = {
        model_name: "Hybrid-Physics-v2.1",
        version: "2.1.0",
        last_trained: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        training_window: "365 Days (Rolling)",
        rmse: Number(rmse.toFixed(2)),
        mape: Number(mape.toFixed(1)),
        mad: Number(mad.toFixed(2)),
        anomaly_detection: {
            method: "IsolationForest (0.05 contam) + EWMA",
            total_anomalies_detected: truePositives + falsePositives,
            precision: Number(precision.toFixed(2)),
            recall: Number(recall.toFixed(2)),
            f1_score: Number(f1.toFixed(2))
        },
        residuals_trend: allResiduals.slice(-20) 
    };

    return { history, metrics };
};

// --- Financial & Community Calcs ---
const calculateFinancials = (schools: School[], history: HistoricalData[]): FinancialStats => {
    // Assumptions:
    // CAPEX ~ 15,000,000 IDR per kWp (Standard Indonesian Solar Pricing)
    const CAPEX_PER_KWP = 15000000; 
    
    const totalCapacity = schools.reduce((sum, s) => sum + s.total_capacity_kwp, 0);
    const totalCapex = totalCapacity * CAPEX_PER_KWP;
    
    const totalSavings = history.reduce((sum, h) => sum + h.savings_idr, 0);
    // Project annual based on historical average
    const dailyAvg = totalSavings / 365;
    const annualSavings = dailyAvg * 365; // Simple projection
    
    const yearsToPayback = annualSavings > 0 ? totalCapex / annualSavings : 0;
    const progress = (totalSavings / totalCapex) * 100;

    // LCOE (Simplified): (Capex + O&M) / Lifetime Energy
    // Assuming 20 year life, O&M 1% of Capex/yr
    const lifetimeYears = 20;
    const totalLifecycleCost = totalCapex * 1.2; 
    const estimatedLifetimeGen = (totalSavings / INITIAL_METADATA.electricity_rate_idr) * lifetimeYears;
    const lcoe = estimatedLifetimeGen > 0 ? totalLifecycleCost / estimatedLifetimeGen : 0;

    return {
        total_capex_idr: totalCapex,
        total_savings_idr: totalSavings,
        payback_progress_percent: progress,
        payback_years: Number(yearsToPayback.toFixed(1)),
        lcoe_idr_per_kwh: Number(lcoe.toFixed(0)),
        irr_percent: 11.2 // Simulated internal rate of return
    };
};

const calculateCommunityStats = (telemetry: Telemetry[]): CommunityStats => {
    let surplus = 0;
    let deficit = 0;
    
    telemetry.forEach(t => {
        if (t.grid_export_kw > 0) surplus += t.grid_export_kw;
        if (t.grid_import_kw > 0) deficit += t.grid_import_kw;
    });

    return {
        total_surplus_kw: Number(surplus.toFixed(1)),
        total_deficit_kw: Number(deficit.toFixed(1)),
        net_grid_flow_kw: Number((surplus - deficit).toFixed(1)),
        active_peers: telemetry.length,
        sharing_potential_idr: Number((Math.min(surplus, deficit) * 200).toFixed(0)) // Simulated arbitrage value
    };
};

// --- Storage Stats ---
const calculateStorageStats = (schools: School[]): StorageStats => {
    const schoolCount = schools.length;
    const RAW_RETENTION_DAYS = 30;
    const AGG_RETENTION_DAYS = 365;
    const RAW_INTERVAL_SEC = 5;
    const totalPoints = (schoolCount * (24 * 3600 / RAW_INTERVAL_SEC) * RAW_RETENTION_DAYS) + 
                       (schoolCount * (24 * 60 / 15) * AGG_RETENTION_DAYS);
    const compressedSizeMB = ((totalPoints * 12 * 8) / (1024 * 1024)) / 12.5;

    return {
        db_engine: "TimescaleDB (PostgreSQL 16)",
        total_points_stored: totalPoints,
        retention_policies: {
            raw: "30 Days (5s Interval)",
            aggregated: "1 Year (15m Interval)"
        },
        storage_usage_mb: Number(compressedSizeMB.toFixed(1)),
        ingestion_rate_mps: Number((schoolCount * 0.2).toFixed(1)),
        active_shards: 4, 
        compression_ratio: 12.5,
        last_rollup_job: new Date(Date.now() - 15 * 60000).toISOString()
    };
};

// --- Real-time Simulator ---
let currentTelemetryState: Telemetry[] = [];
let activeAlerts: Alert[] = [];

export const initializeSimulation = (): DashboardData => {
    const schools = generateSchools();
    const { history, metrics } = generateHistoricalData(schools);
    const storageStats = calculateStorageStats(schools);
    const financialStats = calculateFinancials(schools, history);
    
    currentTelemetryState = schools.map(school => ({
        school_id: school.school_id,
        timestamp: new Date().toISOString(),
        ac_power_kw: 0,
        daily_energy_kwh: 0,
        total_energy_kwh: school.total_capacity_kwp * 1500,
        irradiance_wm2: 0,
        ac_voltage: 230,
        ac_current: 0,
        panel_temp_c: 25,
        efficiency_percent: 95,
        weather_condition: 'sunny',
        performance_ratio: 0,
        fault: 'none',
        load_kw: 0,
        grid_import_kw: 0,
        grid_export_kw: 0,
        self_consumption_percent: 0
    }));

    // Initial calculation of community stats will be zero/nominal until first tick
    const communityStats = calculateCommunityStats(currentTelemetryState);

    return {
        metadata: INITIAL_METADATA,
        schools,
        historical_data: history,
        current_data: currentTelemetryState,
        alerts: activeAlerts,
        storage_stats: storageStats,
        model_metrics: metrics,
        financial_stats: financialStats,
        community_stats: communityStats
    };
};

export const tickSimulation = (schools: School[]): { telemetry: Telemetry[], alerts: Alert[], community: CommunityStats } => {
    const now = new Date();
    
    currentTelemetryState = currentTelemetryState.map(prev => {
        const school = schools.find(s => s.school_id === prev.school_id)!;
        const capacity = school.total_capacity_kwp;
        
        // --- Fault Logic ---
        let currentFault = prev.fault;
        if (currentFault === 'none') {
            if (Math.random() < SIMULATION_CONFIG.fault_probability) {
                 const rand = Math.random();
                 if (rand < 0.8) currentFault = 'comm_down';
                 else if (rand < 0.95) currentFault = 'underperf';
                 else currentFault = 'ground_fault';
            }
        } else {
            const healProb = currentFault === 'comm_down' ? 0.3 : 0.05;
            if (Math.random() < healProb) currentFault = 'none';
        }

        // --- Weather & Physics ---
        let weather = prev.weather_condition;
        if (Math.random() < 0.05) weather = "sunny"; 
        
        let irrFactor = SIMULATION_CONFIG.irradiance_factors[weather] || 0.95;
        irrFactor += (Math.random() - 0.5) * 0.1;
        irrFactor = Math.max(0.1, Math.min(1.1, irrFactor));

        if (currentFault === 'comm_down') return { ...prev, timestamp: now.toISOString(), fault: currentFault };
        if (currentFault === 'ground_fault' || currentFault === 'arc_fault') irrFactor = 0;
        if (currentFault === 'underperf') irrFactor *= 0.6;

        const irradiance = 1000 * irrFactor;
        const cellTemp = SIMULATION_CONFIG.ambient_temp_base + (irradiance / 800) * (SIMULATION_CONFIG.noct - 20);
        const tempLoss = (cellTemp - 25) * SIMULATION_CONFIG.temp_coeff;
        const tempDerate = Math.max(0, 1 - tempLoss);
        const dcPower = capacity * irrFactor * tempDerate;
        const acPower = Math.max(0, dcPower * SIMULATION_CONFIG.inverter_efficiency);
        const voltage = SIMULATION_CONFIG.voltage_base + (Math.random() - 0.5) * SIMULATION_CONFIG.voltage_variance;
        const current = voltage > 0 ? (acPower * 1000) / voltage : 0;
        const energyIncrement = (acPower * (SIMULATION_CONFIG.update_interval_ms / 1000)) / 3600;
        const theoreticalMax = capacity * irrFactor;
        const livePR = theoreticalMax > 0 ? (acPower / theoreticalMax) * 100 : 0;

        // --- Load & Grid Physics ---
        // Base load is roughly 20-40% of capacity (lights, servers, etc)
        // Peak load noise added
        const baseLoad = capacity * 0.3;
        const loadNoise = (Math.random() - 0.5) * (capacity * 0.2);
        const currentLoad = Math.max(0.5, baseLoad + loadNoise); // Always at least 0.5kW

        let gridImport = 0;
        let gridExport = 0;
        let selfConsumed = 0;

        if (acPower >= currentLoad) {
            gridExport = acPower - currentLoad;
            selfConsumed = currentLoad;
        } else {
            gridImport = currentLoad - acPower;
            selfConsumed = acPower;
        }

        const selfConsumptionPct = acPower > 0 ? (selfConsumed / acPower) * 100 : 0;

        return {
            school_id: school.school_id,
            timestamp: now.toISOString(),
            ac_power_kw: Number(acPower.toFixed(3)),
            daily_energy_kwh: Number((prev.daily_energy_kwh + energyIncrement).toFixed(4)),
            total_energy_kwh: Number((prev.total_energy_kwh + energyIncrement).toFixed(4)),
            irradiance_wm2: Math.floor(irradiance),
            ac_voltage: Number(voltage.toFixed(1)),
            ac_current: Number(current.toFixed(1)),
            panel_temp_c: Number(cellTemp.toFixed(1)),
            efficiency_percent: Number((SIMULATION_CONFIG.inverter_efficiency * 100).toFixed(1)),
            weather_condition: weather,
            performance_ratio: Number(livePR.toFixed(1)),
            fault: currentFault,
            load_kw: Number(currentLoad.toFixed(2)),
            grid_import_kw: Number(gridImport.toFixed(2)),
            grid_export_kw: Number(gridExport.toFixed(2)),
            self_consumption_percent: Number(selfConsumptionPct.toFixed(1))
        };
    });

    activeAlerts = activeAlerts.filter(alert => {
        const telemetry = currentTelemetryState.find(t => t.school_id === alert.school_id);
        if (telemetry && telemetry.fault === 'none' && telemetry.performance_ratio >= ALERT_THRESHOLDS.pr_warning) return false;
        return true;
    });

    currentTelemetryState.forEach(t => {
        const school = schools.find(s => s.school_id === t.school_id);
        const alertId = `alert-${t.school_id}`;
        if (t.fault !== 'none' && !activeAlerts.find(a => a.school_id === t.school_id && a.type === t.fault)) {
            activeAlerts.push({
                id: `${alertId}-${Date.now()}`,
                school_id: t.school_id,
                school_name: school?.name || 'Unknown',
                type: t.fault,
                severity: t.fault === 'ground_fault' || t.fault === 'arc_fault' ? 'critical' : 'warning',
                message: FAULT_LABELS[t.fault],
                timestamp: now.toISOString()
            });
        }
    });

    const communityStats = calculateCommunityStats(currentTelemetryState);

    return { telemetry: currentTelemetryState, alerts: activeAlerts, community: communityStats };
};
