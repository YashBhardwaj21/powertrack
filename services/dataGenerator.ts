
import { DashboardData, School, Telemetry, HistoricalData, WeatherCondition, FaultType, Alert, StorageStats, ModelMetrics, FinancialStats, CommunityStats } from '../types';
import { SCHOOL_CONFIGS, INITIAL_METADATA, BANDUNG_CENTER, SIMULATION_CONFIG, FAULT_LABELS, ALERT_THRESHOLDS } from '../constants';

const WEATHER_OPTS: WeatherCondition[] = ["sunny", "partly_cloudy", "cloudy", "rainy"];

// --- Deterministic RNG ---
let seed = SIMULATION_CONFIG.seed;
const seededRandom = (): number => {
    const a = 1664525;
    const c = 1013904223;
    const m = 4294967296; 
    seed = (a * seed + c) % m;
    return seed / m;
};

// --- Helper Functions ---

const getWeightedWeather = (month: number): WeatherCondition => {
    const isDrySeason = month >= 4 && month <= 8;
    const r = seededRandom();
    const weights = isDrySeason ? [0.4, 0.4, 0.15, 0.05] : [0.1, 0.3, 0.4, 0.2]; 

    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
        if (r < sum) return WEATHER_OPTS[i];
    }
    return 'partly_cloudy';
};

const getRandomCoord = (base: number) => base + (seededRandom() - 0.5) * 0.06;

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
        student_count: Math.floor(seededRandom() * 800) + 200,
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
            if (seededRandom() > 0.7) weather = getWeightedWeather(month);

            const irrFactor = SIMULATION_CONFIG.irradiance_factors[weather];
            const baselineSunHours = SIMULATION_CONFIG.base_sun_hours * irrFactor;
            const expectedPR = 0.75;

            const predictedEnergy = Number((school.total_capacity_kwp * baselineSunHours * expectedPR).toFixed(2));
            const noise = 1 + (seededRandom() - 0.5) * 0.06; 
            const seasonalTempFactor = (month >= 4 && month <= 8) ? -0.02 : 0.01; 
            let actualPR = expectedPR + seasonalTempFactor; 

            let isFaulty = false;
            if (seededRandom() < 0.002) {
                 actualPR *= 0.5; 
                 isFaulty = true;
            }

            const actualEnergy = Number((school.total_capacity_kwp * baselineSunHours * actualPR * noise).toFixed(2));
            const peakPower = Number((school.total_capacity_kwp * irrFactor * SIMULATION_CONFIG.inverter_efficiency).toFixed(2));
            const savings = Math.floor(actualEnergy * INITIAL_METADATA.electricity_rate_idr);
            const co2 = Number((actualEnergy * INITIAL_METADATA.carbon_intensity_kg_per_kwh).toFixed(2));
            
            const residual = predictedEnergy - actualEnergy;
            const absResidual = Math.abs(residual);
            const percentageError = actualEnergy > 0 ? absResidual / actualEnergy : 0;
            const modelFlaggedAnomaly = absResidual > (predictedEnergy * 0.25);
            const actualAnomaly = isFaulty || actualPR < 0.55;

            if (modelFlaggedAnomaly && actualAnomaly) truePositives++;
            else if (modelFlaggedAnomaly && !actualAnomaly) falsePositives++;
            else if (!modelFlaggedAnomaly && actualAnomaly) falseNegatives++;

            allResiduals.push(absResidual);
            allActuals.push(actualEnergy);
            if (actualEnergy > 0) allPercentageErrors.push(percentageError);

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

    const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 1;
    const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1 = (precision + recall) > 0 ? 2 * ((precision * recall) / (precision + recall)) : 0;

    const metrics: ModelMetrics = {
        model_name: "Hybrid-Physics-v2.1",
        version: "2.1.0",
        last_trained: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        training_window: "365 Days (Rolling)",
        rmse: Number(rmse.toFixed(2)),
        mape: Number(mape.toFixed(1)),
        mad: Number(mad.toFixed(2)),
        anomaly_detection: {
            method: "IsolationForest (0.01 contam) + EWMA",
            total_anomalies_detected: truePositives + falsePositives,
            precision: Number(precision.toFixed(2)),
            recall: Number(recall.toFixed(2)),
            f1_score: Number(f1.toFixed(2))
        },
        residuals_trend: allResiduals.slice(-20) 
    };

    return { history, metrics };
};

const calculateFinancials = (schools: School[], history: HistoricalData[]): FinancialStats => {
    const CAPEX_PER_KWP = 15000000; 
    const totalCapacity = schools.reduce((sum, s) => sum + s.total_capacity_kwp, 0);
    const totalCapex = totalCapacity * CAPEX_PER_KWP;
    const totalSavings = history.reduce((sum, h) => sum + h.savings_idr, 0);
    const dailyAvg = totalSavings / 365;
    const annualSavings = dailyAvg * 365;
    const yearsToPayback = annualSavings > 0 ? totalCapex / annualSavings : 0;
    const progress = (totalSavings / totalCapex) * 100;
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
        irr_percent: 11.2
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
        sharing_potential_idr: Number((Math.min(surplus, deficit) * 200).toFixed(0))
    };
};

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

// Allow external hydration of the state
export const setSimulationState = (telemetry: Telemetry[]) => {
    currentTelemetryState = telemetry;
};

export const initializeSimulation = (): DashboardData => {
    const schools = generateSchools();
    const { history, metrics } = generateHistoricalData(schools);
    const storageStats = calculateStorageStats(schools);
    const financialStats = calculateFinancials(schools, history);
    
    // Start with non-zero initial values so it looks live immediately
    currentTelemetryState = schools.map(school => {
        const initialPower = school.total_capacity_kwp * 0.4; // 40% capacity start
        return {
            school_id: school.school_id,
            timestamp: new Date().toISOString(),
            ac_power_kw: initialPower,
            daily_energy_kwh: initialPower * 2, // Assume 2 hours of gen already
            total_energy_kwh: school.total_capacity_kwp * 1500,
            irradiance_wm2: 400,
            ac_voltage: 230,
            ac_current: (initialPower * 1000) / 230,
            panel_temp_c: 32,
            efficiency_percent: 95,
            weather_condition: 'sunny',
            performance_ratio: 82,
            fault: 'none',
            load_kw: school.total_capacity_kwp * 0.25,
            grid_import_kw: 0,
            grid_export_kw: initialPower - (school.total_capacity_kwp * 0.25),
            self_consumption_percent: 40
        };
    });

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
    
    // BUG FIX: If currentTelemetryState is empty (due to refresh), re-initialize it
    if (currentTelemetryState.length === 0) {
        currentTelemetryState = schools.map(school => ({
            school_id: school.school_id,
            timestamp: now.toISOString(),
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
    }

    currentTelemetryState = currentTelemetryState.map(prev => {
        const school = schools.find(s => s.school_id === prev.school_id);
        if (!school) return prev;
        
        const capacity = school.total_capacity_kwp;
        
        let currentFault = prev.fault;
        if (currentFault === 'none') {
            if (seededRandom() < SIMULATION_CONFIG.fault_probability) {
                 const rand = seededRandom();
                 if (rand < 0.8) currentFault = 'comm_down';
                 else if (rand < 0.95) currentFault = 'underperf';
                 else currentFault = 'ground_fault';
            }
        } else {
            const healProb = currentFault === 'comm_down' ? 0.3 : 0.05;
            if (seededRandom() < healProb) currentFault = 'none';
        }

        let weather = prev.weather_condition;
        if (seededRandom() < 0.05) {
            weather = WEATHER_OPTS[Math.floor(seededRandom() * WEATHER_OPTS.length)];
        }
        
        let irrFactor = SIMULATION_CONFIG.irradiance_factors[weather] || 0.95;
        irrFactor += (seededRandom() - 0.5) * 0.1;
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
        const voltage = SIMULATION_CONFIG.voltage_base + (seededRandom() - 0.5) * SIMULATION_CONFIG.voltage_variance;
        const current = voltage > 0 ? (acPower * 1000) / voltage : 0;
        
        const dtHours = SIMULATION_CONFIG.update_interval_ms / (1000 * 3600);
        const energyIncrement = acPower * dtHours;
        
        const theoreticalMax = capacity * irrFactor;
        const livePR = theoreticalMax > 0 ? (acPower / theoreticalMax) * 100 : 0;

        const baseLoad = capacity * 0.3;
        const loadNoise = (seededRandom() - 0.5) * (capacity * 0.2);
        const currentLoad = Math.max(0.5, baseLoad + loadNoise); 

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
        if (t.fault !== 'none' && !activeAlerts.find(a => a.school_id === t.school_id && a.type === t.fault)) {
            activeAlerts.push({
                id: `alert-${t.school_id}-${Date.now()}`,
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
