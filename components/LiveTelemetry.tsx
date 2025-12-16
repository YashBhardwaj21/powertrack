
import React, { useState, useEffect } from 'react';
import { Telemetry, School } from '../types';
import { Gauge, Thermometer, Zap, Activity, Terminal, X, ChevronDown, ChevronUp } from 'lucide-react';

interface LiveTelemetryProps {
    data: Telemetry[];
    schools: School[];
}

export const LiveTelemetry: React.FC<LiveTelemetryProps> = ({ data, schools }) => {
    // Auto-rotate through schools or pick highest power
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showDebug, setShowDebug] = useState(false);

    // Rotate selection every 10s if not interacting (simulated kiosk mode)
    useEffect(() => {
        if (!showDebug) {
            const interval = setInterval(() => {
                setSelectedIndex(prev => (prev + 1) % schools.length);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [schools.length, showDebug]);

    const selectedSchool = schools[selectedIndex];
    const telemetry = data.find(d => d.school_id === selectedSchool.school_id);

    if (!telemetry) return null;

    // Map internal types to the specific MQTT payload requested in spec
    const mqttPayload = {
        ts: telemetry.timestamp,
        school_id: telemetry.school_id,
        power_kw: telemetry.ac_power_kw,
        energy_kwh: telemetry.total_energy_kwh,
        irradiance_wm2: telemetry.irradiance_wm2,
        ac_voltage: telemetry.ac_voltage,
        ac_current: telemetry.ac_current,
        temp_c: telemetry.panel_temp_c,
        fault: telemetry.fault
    };

    return (
        <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 overflow-hidden relative transition-all duration-300">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h2 className="text-lg font-medium text-slate-300">Live Hardware Telemetry</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <select 
                            value={selectedIndex}
                            onChange={(e) => setSelectedIndex(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-white text-xl font-bold rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        >
                            {schools.map((s, idx) => (
                                <option key={s.school_id} value={idx}>{s.name}</option>
                            ))}
                        </select>
                        {telemetry.fault !== 'none' && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded animate-pulse font-bold">
                                FAULT: {telemetry.fault.toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 font-mono">MSG_ID: {Date.now().toString().slice(-6)}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                         <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono border border-slate-700">QoS: 1</span>
                         <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-500 font-mono border border-slate-700">TLS: ON</span>
                    </div>
                    <button 
                        onClick={() => setShowDebug(!showDebug)}
                        className="mt-2 text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                    >
                        {showDebug ? <ChevronUp className="w-3 h-3"/> : <Terminal className="w-3 h-3"/>}
                        {showDebug ? 'Hide Payload' : 'View Raw MQTT'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                {/* AC Power Block */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-xs uppercase font-bold tracking-wider">AC Output</span>
                    </div>
                    <div className="text-2xl font-mono font-bold">{telemetry.ac_power_kw.toFixed(2)} <span className="text-sm text-slate-500">kW</span></div>
                    <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-500" style={{width: `${(telemetry.ac_power_kw / selectedSchool.total_capacity_kwp) * 100}%`}}></div>
                    </div>
                </div>

                {/* Voltage/Current Block */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs uppercase font-bold tracking-wider">Grid</span>
                    </div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-sm text-slate-400">V</span>
                        <span className="font-mono font-bold text-lg">{telemetry.ac_voltage.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-0.5 mb-2 rounded-full"><div className="bg-green-500 h-full" style={{width: '98%'}}></div></div>
                    
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-slate-400">A</span>
                        <span className="font-mono font-bold text-lg">{telemetry.ac_current.toFixed(1)}</span>
                    </div>
                </div>

                {/* Environment Block */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                        <Thermometer className="w-4 h-4" />
                        <span className="text-xs uppercase font-bold tracking-wider">Environment</span>
                    </div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-sm text-slate-400">Irr.</span>
                        <span className="font-mono font-bold text-lg">{telemetry.irradiance_wm2} <span className="text-xs">W/m²</span></span>
                    </div>
                     <div className="flex justify-between items-end mt-2">
                        <span className="text-sm text-slate-400">Tmp.</span>
                        <span className="font-mono font-bold text-lg">{telemetry.panel_temp_c.toFixed(1)}°C</span>
                    </div>
                </div>

                {/* Efficiency Block */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                     <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <Gauge className="w-4 h-4" />
                        <span className="text-xs uppercase font-bold tracking-wider">Performance</span>
                    </div>
                    <div className="text-center mt-1">
                        <div className="text-2xl font-mono font-bold">{telemetry.performance_ratio.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500 mt-1">Performance Ratio</div>
                    </div>
                     <div className="text-center mt-2 border-t border-slate-700 pt-2">
                        <span className="text-xs text-slate-400">Inv. Eff: </span>
                        <span className="text-sm font-mono text-white">{telemetry.efficiency_percent}%</span>
                    </div>
                </div>
            </div>

            {/* Debug Payload View */}
            {showDebug && (
                <div className="mt-4 pt-4 border-t border-slate-700 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-mono text-emerald-400">INCOMING PACKET (TCP/8883)</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Topic: sites/{telemetry.school_id}/telemetry</span>
                    </div>
                    <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800 relative group">
                        <pre>{JSON.stringify(mqttPayload, null, 2)}</pre>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">JSON</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
