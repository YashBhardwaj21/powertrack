
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SchoolMetadata {
  created_date: string;
  description: string;
  electricity_rate_idr: number;
  carbon_intensity_kg_per_kwh: number;
}

export interface School {
  school_id: string;
  name: string;
  type: string;
  address: string;
  coordinates: Coordinates;
  district: string;
  principal_name: string;
  contact_email: string;
  student_count: number;
  total_capacity_kwp: number;
  installation_date: string;
}

export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy';
export type FaultType = 'none' | 'underperf' | 'comm_down' | 'ground_fault' | 'arc_fault';

export interface Telemetry {
  school_id: string;
  timestamp: string;
  ac_power_kw: number;
  daily_energy_kwh: number;
  total_energy_kwh: number;
  irradiance_wm2: number;
  ac_voltage: number;
  ac_current: number;
  panel_temp_c: number;
  efficiency_percent: number;
  weather_condition: WeatherCondition;
  performance_ratio: number;
  fault: FaultType;
  // New Grid/Load Metrics
  load_kw: number;
  grid_import_kw: number;
  grid_export_kw: number;
  self_consumption_percent: number;
}

export interface HistoricalData {
  record_id: string;
  school_id: string;
  date: string;
  total_energy_kwh: number;
  predicted_energy_kwh: number; 
  peak_power_kw: number;
  performance_ratio: number;
  capacity_utilization: number;
  weather_condition: WeatherCondition;
  savings_idr: number;
  co2_saved_kg: number;
  anomaly_count: number;
}

export interface Alert {
  id: string;
  school_id: string;
  school_name: string;
  type: FaultType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export interface StorageStats {
  db_engine: string;
  total_points_stored: number;
  retention_policies: {
    raw: string;
    aggregated: string;
  };
  storage_usage_mb: number;
  ingestion_rate_mps: number; 
  active_shards: number;
  compression_ratio: number;
  last_rollup_job: string;
}

export interface ModelMetrics {
  model_name: string;
  version: string;
  last_trained: string;
  training_window: string;
  rmse: number; 
  mape: number; 
  mad: number;  
  anomaly_detection: {
    method: string;
    total_anomalies_detected: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  residuals_trend: number[]; 
}

export interface FinancialStats {
    total_capex_idr: number;
    total_savings_idr: number;
    payback_progress_percent: number;
    payback_years: number;
    lcoe_idr_per_kwh: number;
    irr_percent: number;
}

export interface CommunityStats {
    total_surplus_kw: number;
    total_deficit_kw: number;
    net_grid_flow_kw: number;
    active_peers: number;
    sharing_potential_idr: number;
}

export interface DashboardData {
  metadata: SchoolMetadata;
  schools: School[];
  current_data: Telemetry[];
  historical_data: HistoricalData[];
  alerts: Alert[];
  storage_stats: StorageStats;
  model_metrics: ModelMetrics;
  financial_stats: FinancialStats;
  community_stats: CommunityStats;
}
