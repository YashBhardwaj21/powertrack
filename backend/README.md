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
