
export const SCHOOL_CONFIGS = [
    // --- Small Schools (3-10 kWp) - 50% ---
    { id: "SCH_WJ_003", name: "SMK PGRI 1 Bandung", capacity: 5.5, type: "Vocational High School", address: "Jl. Kopo No. 154", district: "Bandung City" },
    { id: "SCH_WJ_004", name: "SMP Negeri 5 Bandung", capacity: 8.0, type: "Junior High School", address: "Jl. Belitung No. 8", district: "Bandung City" },
    { id: "SCH_WJ_007", name: "SMP Negeri 2 Bandung", capacity: 6.2, type: "Junior High School", address: "Jl. Sumatera No. 42", district: "Sumur Bandung" },
    { id: "SCH_WJ_002", name: "SD Negeri 1 Lembang", capacity: 4.5, type: "Primary School", address: "Jl. Raya Lembang", district: "West Bandung" },
    { id: "SCH_WJ_011", name: "Madrasah Ibtidaiyah 3", capacity: 9.0, type: "Islamic Primary School", address: "Jl. Cibiru Hilir", district: "Bandung Regency" },

    // --- Medium Schools (10-20 kWp) - 35% ---
    { id: "SCH_WJ_002_HS", name: "SMA Negeri 4 Bandung", capacity: 15.0, type: "Public High School", address: "Jl. Gardujati No. 20", district: "Bandung City" },
    { id: "SCH_WJ_006", name: "SMA Negeri 8 Bandung", capacity: 18.5, type: "Public High School", address: "Jl. Solontongan No. 3", district: "Lengkong" },
    { id: "SCH_WJ_009", name: "SMA Taruna Bakti", capacity: 12.0, type: "Private High School", address: "Jl. L.L.R.E. Martadinata", district: "Bandung Wetan" },

    // --- Large Schools (20-30 kWp) - 15% ---
    { id: "SCH_WJ_001", name: "SMKN 1 Bandung", capacity: 25.0, type: "Vocational High School", address: "Jl. Jakarta No. 31", district: "Bandung City" },
    { id: "SCH_WJ_010", name: "SMK Negeri 2 Bandung", capacity: 28.0, type: "Vocational High School", address: "Jl. Ciliwung No. 4", district: "Cibeunying" }
];

export const INITIAL_METADATA = {
    created_date: new Date().toISOString().split('T')[0],
    description: "PowerTrack Dynamic Dataset for West Java Schools",
    electricity_rate_idr: 1444.7,
    carbon_intensity_kg_per_kwh: 0.85
};

export const SIMULATION_CONFIG = {
    // Determinism
    seed: 12345, // Fixed seed for reproducible demos

    // West Java Solar Resource (Global Solar Atlas)
    base_sun_hours: 4.5, // kWh/m2/day median for Bandung
    
    // Physics Constants
    noct: 45, // Nominal Operating Cell Temperature (°C)
    temp_coeff: 0.004, // -0.4% per °C (Power loss factor)
    inverter_efficiency: 0.95, // Conservative baseline (95-98% typical)
    system_availability: 0.99,

    // Weather Probability
    weather_weights: [0.2, 0.4, 0.3, 0.1], // sunny, partly, cloudy, rainy
    irradiance_factors: {
        sunny: 0.95,      // Peak clear sky
        partly_cloudy: 0.75,
        cloudy: 0.45,
        rainy: 0.15
    },

    // Grid Physics
    voltage_base: 230, // Standard Indonesian Grid Voltage
    voltage_variance: 10, // +/- V
    ambient_temp_base: 28, // Avg daytime temp Bandung (°C)
    
    // Fault Injection (Realistic Rates)
    // 0.00002 per tick ~ once every 24-30 hours of simulation time per school
    fault_probability: 0.00002, 
    update_interval_ms: 2000
};

export const ALERT_THRESHOLDS = {
    // IEC/IEA Standards
    pr_critical: 70, // < 70%
    pr_warning: 78,  // < 78%
    energy_yield_min_percent: 70 // < 70% of expected
};

export const WEATHER_ICONS: Record<string, string> = {
    'sunny': '☀️',
    'partly_cloudy': '⛅',
    'cloudy': '☁️',
    'rainy': '🌧️'
};

export const FAULT_LABELS: Record<string, string> = {
    'none': 'System Nominal',
    'underperf': 'Underperformance (PR < 70%)',
    'comm_down': 'Gateway Offline',
    'ground_fault': 'Ground Fault Protection',
    'arc_fault': 'DC Arc Detected'
};

export const BANDUNG_CENTER = { lat: -6.9175, lng: 107.6191 };

// SunSpec Modbus Map (Simulated)
// Proves to hardware integrators we understand the registers
export const MODBUS_REGISTER_MAP = {
    40001: { name: 'C_SunSpec_ID', type: 'uint32', desc: 'SunSpec DID' },
    40003: { name: 'C_Device_ID', type: 'uint16', desc: 'Inverter ID' },
    40069: { name: 'AC_Current', type: 'float32', unit: 'A' },
    40071: { name: 'AC_Voltage_Phase_A', type: 'float32', unit: 'V' },
    40083: { name: 'AC_Power', type: 'float32', unit: 'W' },
    40085: { name: 'AC_Frequency', type: 'float32', unit: 'Hz' },
    40093: { name: 'Total_Energy_Wh', type: 'acc32', unit: 'Wh' },
    40101: { name: 'DC_Amps', type: 'float32', unit: 'A' },
    40103: { name: 'DC_Voltage', type: 'float32', unit: 'V' },
    40105: { name: 'DC_Power', type: 'float32', unit: 'W' },
    40107: { name: 'Cabinet_Temp', type: 'float32', unit: 'C' }
};

// Localization Dictionary
export const TRANSLATIONS: Record<string, Record<string, string>> = {
    en: {
        dashboard: "Dashboard",
        schools: "Schools",
        analytics: "Analytics",
        total_power: "Total Power Generated",
        daily_energy: "Daily Energy Production",
        savings: "Est. Daily Savings",
        co2: "CO₂ Avoided Today",
        live_telemetry: "Live Hardware Telemetry",
        exec_view: "Executive View",
        eng_view: "Engineering View",
        status_online: "Online",
        status_fault: "Fault",
        grid_export: "Grid Export",
        grid_import: "Grid Import"
    },
    id: {
        dashboard: "Dasbor Operasional",
        schools: "Daftar Sekolah",
        analytics: "Analisis Data",
        total_power: "Total Daya Dihasilkan",
        daily_energy: "Produksi Energi Harian",
        savings: "Est. Penghematan Harian",
        co2: "CO₂ Dihindari Hari Ini",
        live_telemetry: "Telemetri Perangkat Keras",
        exec_view: "Tampilan Eksekutif",
        eng_view: "Tampilan Teknisi",
        status_online: "Online",
        status_fault: "Gangguan",
        grid_export: "Ekspor Grid",
        grid_import: "Impor Grid"
    }
};
