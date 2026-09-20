# MEDSYNC: Smart Hospital Resource Coordination Platform

> A real-time hospital resource coordination platform providing visibility into beds, emergency capacity, blood requirements, and critical services to assist coordinators in high-demand emergency scenarios.

---

## 🏗️ Project Structure

```
MedSync/
│
├── frontend/                 # React 18 + Vite + Tailwind CSS + React Router
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI widgets (MetricCard, StatusPill)
│   │   ├── pages/            # Views (Dashboard, Hospitals, EmergencyConsole, Analytics)
│   │   ├── layouts/          # Shell navigation (Navbar, Footer, MainLayout)
│   │   ├── services/         # API fetchers (apiClient, healthService)
│   │   ├── hooks/            # Custom hooks (useSystemHealth)
│   │   ├── context/          # React context (AppContext)
│   │   ├── App.jsx           # Router configuration
│   │   ├── main.jsx          # React DOM entry
│   │   └── index.css         # Tailwind base styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/                  # Node.js + Express.js API
│   ├── src/
│   │   ├── routes/           # Express routers (index.js, healthRoutes.js)
│   │   ├── controllers/      # Handlers (healthController.js)
│   │   ├── services/         # Business logic (healthService.js)
│   │   ├── middleware/       # Error handling (errorHandler.js)
│   │   ├── db/               # PostgreSQL connection layer (index.js)
│   │   ├── utils/            # Logging utility (logger.js)
│   │   └── server.js         # Server entry point
│   ├── package.json
│   └── .env.example
│
├── database/
│   └── schema.sql            # PostgreSQL relational schema
│
├── docs/
│   └── architecture.md       # High-level architecture documentation
│
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on v24.x)
- PostgreSQL (optional for health check baseline; service runs gracefully in standby mode if not configured)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables (defaults work out of the box)
cp .env.example .env

# Start backend server
npm run dev
# or: node src/server.js
```

The backend runs on `http://localhost:5000`.
Health check: `http://localhost:5000/api/health`

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start frontend dev server
npm run dev
```

The frontend runs on `http://localhost:5173`.

---

## 📡 Health Check API

* **Endpoint:** `GET /api/health`
* **Sample Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "MedSync API - Hospital Resource Coordination Platform",
    "version": "1.0.0",
    "timestamp": "2026-09-19T05:39:24.123Z",
    "uptime": 14,
    "database": {
      "type": "PostgreSQL",
      "connected": true,
      "details": "PostgreSQL connection healthy",
      "databaseName": "medsync"
    },
    "environment": "development"
  }
}
```

---

## 🛡️ Current Status: Phase 1 Complete
- [x] Separate Frontend & Backend application structure
- [x] React + Vite + Tailwind CSS + React Router configured
- [x] Node.js + Express backend foundation
- [x] PostgreSQL connection pool layer with health test & graceful fallback
- [x] Environment variable configuration with `.env.example`
- [x] Command Center layout and visual foundation
- [x] `GET /api/health` diagnostic endpoint

## H4 feature-complete additions

This build is aligned to the Versathon 2.0 H4 — Smart Hospital Resource Coordination scope: real-time resource availability, hospital/department/resource management, emergency request workflow, status/operational notifications, demand/utilization analytics, and a read-only what-if scenario simulator. The simulator projects resource strain from the current PostgreSQL baseline and does not change live inventory unless the user explicitly chooses **Apply Simulation**.

### Added in this build
- Functional **Demand & Utilization Analytics** page backed by PostgreSQL (7-day emergency demand, hospital bed occupancy, resource utilization, blood reserve alerts, and response metric).
- Functional **Operational Notifications** bell in the navbar with unread count, live DIVERT/SURGE/blood alerts, and mark-read/mark-all-read actions.
- Improved **What-if Simulator** output with scenario severity, stress index, projected resource gaps, and a planning recommendation.
- Hardened simulator apply/cleanup flow and preserved synthetic-data flags so simulated requests/reservations remain distinguishable from live operational data.
- Existing H4 modules retained: hospital/department/resource management, emergency request creation/dispatch/matching, hospital status updates, resource reservations, and dashboard alerts.

### Database
Run the normal migrations and seed commands before starting the application:
```bash
cd backend
npm install
npm run migrate
npm run seed
npm start
```
Then in another terminal:
```bash
cd frontend
npm install
npm run dev
```
