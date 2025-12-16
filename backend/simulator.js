/**
 * PowerTrack Backend Simulator
 * 
 * 1. Connects to SQLite Database (creates power_track.db)
 * 2. Connects to MQTT Broker
 * 3. Runs Physics Simulation Loop (2s tick)
 * 4. Publishes to MQTT topics: sites/{school_id}/telemetry
 * 5. Persists data to SQLite
 */

const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const MQTT_BROKER_URL = process.env.MQTT_URL || 'mqtt://test.mosquitto.org'; // Public test broker for demo
const DB_PATH = path.join(__dirname, 'power_track.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// --- Physics Constants (Matched to Frontend) ---
const SIMULATION_CONFIG = {
    voltage_base: 230,
    voltage_variance: 10,
    temp_coeff: 0.004,
    noct: 45,
    ambient_temp_base: 28,
    inverter_efficiency: 0.95,
    irradiance_factors: { sunny: 0.95, partly_cloudy: 0.75, cloudy: 0.45, rainy: 0.15 }
};

// --- School Configuration (Static Data) ---
const SCHOOLS = [
    { id: "SCH_WJ_003", name: "SMK PGRI 1 Bandung", capacity: 5.5, district: "Bandung City" },
    { id: "SCH_WJ_004", name: "SMP Negeri 5 Bandung", capacity: 8.0, district: "Bandung City" },
    { id: "SCH_WJ_007", name: "SMP Negeri 2 Bandung", capacity: 6.2, district: "Sumur Bandung" },
    { id: "SCH_WJ_002", name: "SD Negeri 1 Lembang", capacity: 4.5, district: "West Bandung" },
    { id: "SCH_WJ_011", name: "Madrasah Ibtidaiyah 3", capacity: 9.0, district: "Bandung Regency" },
    { id: "SCH_WJ_002_HS", name: "SMA Negeri 4 Bandung", capacity: 15.0, district: "Bandung City" },
    { id: "SCH_WJ_006", name: "SMA Negeri 8 Bandung", capacity: 18.5, district: "Lengkong" },
    { id: "SCH_WJ_009", name: "SMA Taruna Bakti", capacity: 12.0, district: "Bandung Wetan" },
    { id: "SCH_WJ_001", name: "SMKN 1 Bandung", capacity: 25.0, district: "Bandung City" },
    { id: "SCH_WJ_010", name: "SMK Negeri 2 Bandung", capacity: 28.0, district: "Cibeunying" }
];

// --- Initialization ---

// 1. Setup Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error("DB Connection Error:", err.message);
    console.log(`Connected to SQLite database at ${DB_PATH}`);
});

// Initialize Schema
const initDb = () => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema, (err) => {
        if (err) console.error("Schema Init Error:", err);
        else {
            console.log("Database schema initialized.");
            // Seed schools if empty
            SCHOOLS.forEach(s => {
                db.run(
                    `INSERT OR IGNORE INTO schools (school_id, name, district, total_capacity_kwp) VALUES (?, ?, ?, ?)`,
                    [s.id, s.name, s.district, s.capacity]
                );
            });
        }
    });
};

initDb();

// 2. Setup MQTT
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on('connect', () => {
    console.log(`Connected to MQTT Broker at ${MQTT_BROKER_URL}`);
});

mqttClient.on('error', (err) => {
    console.error("MQTT Error:", err);
});

// --- Simulation Logic ---

// State tracking for continuity
const schoolStates = {}; 

SCHOOLS.forEach(s => {
    schoolStates[s.id] = {
        total_energy: s.capacity * 1500, // Start with some history
        daily_energy: 0,
        weather: 'sunny',
        fault: 'none',
        last_tick: Date.now()
    };
});

const calculatePhysics = (school) => {
    const state = schoolStates[school.id];
    const now = Date.now();
    
    // 1. Weather Dynamics (Markov Chain-ish)
    if (Math.random() < 0.05) {
        const weathers = ['sunny', 'partly_cloudy', 'cloudy', 'rainy'];
        state.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }

    // 2. Fault Injection
    if (state.fault === 'none' && Math.random() < 0.001) state.fault = 'underperf';
    else if (state.fault !== 'none' && Math.random() < 0.1) state.fault = 'none'; // Auto-heal

    // 3. Solar Calculations
    let irrFactor = SIMULATION_CONFIG.irradiance_factors[state.weather];
    irrFactor += (Math.random() - 0.5) * 0.1; // Noise
    
    if (state.fault !== 'none') irrFactor *= 0.5; // Fault penalty

    const irradiance = Math.max(0, 1000 * irrFactor);
    const cellTemp = SIMULATION_CONFIG.ambient_temp_base + (irradiance / 800) * (SIMULATION_CONFIG.noct - 20);
    const tempLoss = (cellTemp - 25) * SIMULATION_CONFIG.temp_coeff;
    
    // Power Output
    const dcPower = school.capacity * irrFactor * (1 - tempLoss);
    const acPower = Math.max(0, dcPower * SIMULATION_CONFIG.inverter_efficiency);

    // Grid Physics
    const voltage = SIMULATION_CONFIG.voltage_base + (Math.random() - 0.5) * SIMULATION_CONFIG.voltage_variance;
    const current = voltage > 0 ? (acPower * 1000) / voltage : 0;

    // Load & Grid Flow
    const baseLoad = school.capacity * 0.3;
    const loadKw = Math.max(0.2, baseLoad + (Math.random() - 0.5));
    let gridExport = 0;
    let gridImport = 0;

    if (acPower > loadKw) {
        gridExport = acPower - loadKw;
    } else {
        gridImport = loadKw - acPower;
    }

    // Energy Accumulation
    const hoursSinceLast = (now - state.last_tick) / (1000 * 3600);
    state.daily_energy += acPower * hoursSinceLast;
    state.total_energy += acPower * hoursSinceLast;
    state.last_tick = now;

    return {
        school_id: school.id,
        timestamp: new Date().toISOString(),
        ac_power_kw: parseFloat(acPower.toFixed(3)),
        daily_energy_kwh: parseFloat(state.daily_energy.toFixed(3)),
        total_energy_kwh: parseFloat(state.total_energy.toFixed(2)),
        irradiance_wm2: Math.floor(irradiance),
        panel_temp_c: parseFloat(cellTemp.toFixed(1)),
        ac_voltage: parseFloat(voltage.toFixed(1)),
        ac_current: parseFloat(current.toFixed(1)),
        grid_export_kw: parseFloat(gridExport.toFixed(2)),
        grid_import_kw: parseFloat(gridImport.toFixed(2)),
        weather_condition: state.weather,
        fault_status: state.fault
    };
};

// --- Main Loop ---

console.log("Starting Simulation Loop (2000ms tick)...");

setInterval(() => {
    SCHOOLS.forEach(school => {
        const data = calculatePhysics(school);
        const topic = `sites/${school.id}/telemetry`;

        // 1. Publish to MQTT
        if (mqttClient.connected) {
            mqttClient.publish(topic, JSON.stringify(data), { qos: 1 });
        }

        // 2. Insert into DB
        const stmt = db.prepare(`
            INSERT INTO telemetry (
                school_id, timestamp, ac_power_kw, daily_energy_kwh, total_energy_kwh,
                irradiance_wm2, panel_temp_c, ac_voltage, ac_current, 
                grid_export_kw, grid_import_kw, weather_condition, fault_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            data.school_id, data.timestamp, data.ac_power_kw, data.daily_energy_kwh, data.total_energy_kwh,
            data.irradiance_wm2, data.panel_temp_c, data.ac_voltage, data.ac_current,
            data.grid_export_kw, data.grid_import_kw, data.weather_condition, data.fault_status
        ], (err) => {
            if (err) console.error("DB Insert Error:", err.message);
        });
        stmt.finalize();

        // 3. Handle Alerts (Simplified)
        if (data.fault_status !== 'none') {
            const alertId = `AL_${school.id}_${Date.now()}`;
            db.run(
                `INSERT INTO alerts (id, school_id, type, severity, message, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
                [alertId, school.id, data.fault_status, 'warning', 'System performance degradation detected', data.timestamp],
                (err) => { if(!err && mqttClient.connected) mqttClient.publish(`sites/${school.id}/alerts`, JSON.stringify({id: alertId, type: data.fault_status})); }
            );
        }
    });
    
    // Visual heartbeat
    process.stdout.write('.');
}, 2000);

// Cleanup
process.on('SIGINT', () => {
    db.close();
    mqttClient.end();
    console.log("\nSimulator stopped.");
    process.exit();
});
