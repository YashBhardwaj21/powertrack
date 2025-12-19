# PowerTrack: West Java Solar Monitoring System

**PowerTrack** is a high-fidelity Digital Twin and operational dashboard designed for community-scale solar management across the West Java school network. It provides school administrators, engineers, and government officials with real-time insights into energy production, financial ROI, and environmental impact.

## 🚀 Key Features

### 1. Executive Operations Center
*   **Fleet-Wide Monitoring:** Track real-time power generation across 10 diverse school sites.
*   **Environmental Impact:** Real-time conversion of energy production into tangible metrics (Trees planted, CO₂ avoided, car kilometers offset).
*   **Community Leaderboard:** Gamified energy production ranking to encourage sustainability.

### 2. Engineering & Technical Analysis
*   **Live Hardware Telemetry:** Simulated MQTT/Modbus register mapping for AC Power, Grid Voltage, Current, and Irradiance.
*   **Digital Twin Physics:** Data is generated using realistic PV physics (Irradiance factors, Temperature derating, and Inverter efficiency).
*   **Anomaly Detection:** A hybrid "Physics + AI" model that flags underperformance, ground faults, and gateway offline events with a calibrated 25% threshold to eliminate weather-related false positives.

### 3. Financial & Grid Analytics
*   **VPP Simulation:** A Virtual Power Plant view showing community energy sharing potential and net-metering (Surplus vs. Deficit).
*   **ROI Tracking:** Levelized Cost of Energy (LCOE) and internal rate of return (IRR) calculations based on actual Indonesian electricity rates (Rp 1,444.7/kWh).

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 19 (Vite)
*   **Styling:** Tailwind CSS
*   **Visualization:** Recharts (Analytical charts) & Leaflet (Geospatial mapping)
*   **Persistence:** IndexedDB (for local session storage)

### Backend (Simulator)
*   **Runtime:** Node.js
*   **Database:** SQLite3 (Local persistence)
*   **Protocol:** MQTT (via test.mosquitto.org) for real-time packet broadcasting.

## 📥 Installation & Setup

### 1. Frontend Setup
bash
# Install dependencies
npm install

# Start the development server
npm run dev
2. Backend Simulator Setup
The backend simulates physical solar hardware. It must be running to receive live MQTT packets.
code
Bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start the physics simulator
node simulator.js

🧬 Data Generation Methodology
PowerTrack uses a Deterministic Physics Engine to generate data. Unlike static mockups, the data is calculated every 2 seconds using:
Linear Congruential Generator (LCG): Ensures that "random" weather events are reproducible across different demo sessions.

PV Physics Model:
Irradiance: Scaled by weather conditions (Sunny, Cloudy, Rainy).
Temp Loss: Calculated using the NOCT (Nominal Operating Cell Temperature) formula.
Load Profiling: Schools follow a dual-peak consumption curve (morning classes and afternoon labs).

📊 Analytics Deep Dive
Model Accuracy: The system tracks RMSE and MAPE for its internal prediction model.
Storage Optimization: Demonstrates a data retention policy where high-frequency raw data (5s) is downsampled into 15-minute historical rollups for long-term storage efficiency.
