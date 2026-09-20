# MEDSYNC Architecture Overview

## High-Level Diagram

```
+-------------------------------------------------------------+
|                  FRONTEND (Client Browser)                  |
|                 React 18 + Vite + Tailwind CSS              |
|                                                             |
|   [Command Dashboard]   [Hospitals]   [Emergency Console]   |
+-------------------------------------------------------------+
                              |
               REST HTTP / Server-Sent Events
                              |
+-------------------------------------------------------------+
|                     BACKEND (Node.js API)                   |
|                        Express.js                           |
|                                                             |
|   - routes/ (Endpoints)                                     |
|   - controllers/ (Request Handlers)                         |
|   - services/ (Matching Engine, Health, Resource Logic)     |
|   - middleware/ (Error Handlers, Validation)                |
|   - db/ (PostgreSQL Pool Connection Layer)                  |
|   - utils/ (Logger, Math & Distance Formulas)               |
+-------------------------------------------------------------+
                              |
             PostgreSQL Connection Pool (pg)
                              |
+-------------------------------------------------------------+
|                     DATABASE (PostgreSQL)                   |
|                  hospitals, bed_inventories,                |
|                blood_inventories, emergencies               |
+-------------------------------------------------------------+
```

## Core Modules
1. **Frontend (`/frontend`)**: Single-page application configured with Vite, React Router, Tailwind CSS, and Lucide icons.
2. **Backend (`/backend`)**: Modular Node.js / Express REST API with environment variable management via `dotenv`.
3. **Database (`/database`)**: Relational PostgreSQL schema (`database/schema.sql`) covering facilities, departments, bed capacity, blood units, and emergency requests.
4. **Docs (`/docs`)**: Architecture guides, API specifications, and presentation workflows.
