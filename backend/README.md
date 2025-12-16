# PowerTrack Backend Simulator

This Node.js service simulates the physical solar infrastructure. It generates realistic telemetry based on physics formulas, persists it to a local SQLite database, and broadcasts it via MQTT.

## How to Run on Your Device

### 1. Prerequisites
Ensure you have **Node.js** installed on your computer. You can download it from [nodejs.org](https://nodejs.org/).

### 2. Setup
Open your terminal (Command Prompt, PowerShell, or Terminal) and navigate to the `backend` folder:
```bash
cd backend
```

Install the required dependencies:
```bash
npm install
```

### 3. Start the Simulator
Run the script:
```bash
node simulator.js
```

## Architecture & API

### Is it using an API?
**Yes and No.**
*   **External Data:** No. It does **not** fetch data from external weather or solar APIs (like OpenWeatherMap). It generates data internally using mathematical models (randomized weather patterns, physics formulas for voltage/current).
*   **Communication:** Yes. It uses the **MQTT Protocol** (an IoT standard) to broadcast data. It connects to a public broker (`test.mosquitto.org`) and publishes JSON messages to specific topics.

### Data Flow
1.  **Generation:** `simulator.js` calculates power output based on time of day and simulated weather.
2.  **Storage:** Data is saved to `power_track.db` (SQLite) for historical reporting.
3.  **Broadcast:** Real-time data is sent to the MQTT Broker.
