-- =========================================================
-- MEDSYNC: Smart Hospital Resource Coordination Platform
-- PostgreSQL Database Schema
-- =========================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HOSPITALS
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    tier VARCHAR(50) DEFAULT 'Regional',
    trauma_level VARCHAR(20) DEFAULT 'Level 2',
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Metropolis',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(100),
    status VARCHAR(30) DEFAULT 'NORMAL', -- 'NORMAL', 'SURGE', 'DIVERT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    head_name VARCHAR(100),
    floor VARCHAR(20),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BED INVENTORIES
CREATE TABLE IF NOT EXISTS bed_inventories (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    bed_type VARCHAR(50) NOT NULL, -- 'GENERAL', 'ICU', 'PEDIATRIC', 'ISOLATION'
    total_capacity INTEGER NOT NULL DEFAULT 0,
    occupied INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    available INTEGER GENERATED ALWAYS AS (total_capacity - occupied - reserved) STORED,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_hospital_bed_type UNIQUE (hospital_id, bed_type)
);

-- 4. BLOOD INVENTORIES
CREATE TABLE IF NOT EXISTS blood_inventories (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_type VARCHAR(10) NOT NULL, -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    units_available INTEGER NOT NULL DEFAULT 0,
    critical_threshold INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_hospital_blood_type UNIQUE (hospital_id, blood_type)
);

-- 5. EQUIPMENT INVENTORIES
CREATE TABLE IF NOT EXISTS equipment_inventories (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL, -- 'VENTILATOR', 'DIALYSIS', 'OXYGEN_CONCENTRATOR', 'AMBULANCE'
    total_units INTEGER NOT NULL DEFAULT 0,
    available_units INTEGER NOT NULL DEFAULT 0,
    in_use_units INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_hospital_equipment_type UNIQUE (hospital_id, equipment_type)
);

-- 6. EMERGENCY REQUESTS
CREATE TABLE IF NOT EXISTS emergency_requests (
    id VARCHAR(50) PRIMARY KEY,
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    category VARCHAR(50) NOT NULL, -- 'TRAUMA', 'CARDIAC', 'RESPIRATORY', 'BLOOD_SHORTAGE', 'MASS_CASUALTY'
    patient_reference VARCHAR(100) NOT NULL, -- Synthetic code, e.g. 'ANON-PT-2041'
    requesting_entity VARCHAR(150) NOT NULL, -- 'Ambulance Unit 12', 'Suburban Clinic'
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    required_resources JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'DISPATCHED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'
    assigned_hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 7. NOTIFICATIONS / AUDIT LOG
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'INFO', -- 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'
    target_hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    reference_emergency_id VARCHAR(50) REFERENCES emergency_requests(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
