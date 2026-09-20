-- ====================================================================
-- MEDSYNC: Smart Hospital Resource Coordination Platform
-- Migration 001: Initial PostgreSQL Schema
-- ====================================================================

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'Regional',
    trauma_level VARCHAR(30) NOT NULL DEFAULT 'Level 2' 
        CHECK (trauma_level IN ('Level 1', 'Level 2', 'Level 3', 'Community', 'Specialized')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Metropolis',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'NORMAL' 
        CHECK (status IN ('NORMAL', 'SURGE', 'DIVERT', 'LOCKDOWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL 
        CHECK (role IN ('ADMIN', 'REGIONAL_COORDINATOR', 'HOSPITAL_COORDINATOR', 'PARAMEDIC')),
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE SET NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    head_name VARCHAR(150),
    floor_location VARCHAR(50),
    contact_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hospital_dept UNIQUE (hospital_id, department_code)
);

-- 4. RESOURCES TABLE (Hospital -> Department -> Resources)
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id VARCHAR(50) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL 
        CHECK (category IN ('BED', 'BLOOD', 'EQUIPMENT', 'EMERGENCY_CAPACITY')),
    resource_type VARCHAR(100) NOT NULL,
    total_capacity INTEGER NOT NULL DEFAULT 0 CHECK (total_capacity >= 0),
    occupied_quantity INTEGER NOT NULL DEFAULT 0 CHECK (occupied_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INTEGER GENERATED ALWAYS AS (total_capacity - occupied_quantity - reserved_quantity) STORED,
    critical_threshold INTEGER NOT NULL DEFAULT 5 CHECK (critical_threshold >= 0),
    unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'units',
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' 
        CHECK (status IN ('AVAILABLE', 'LOW_STOCK', 'DEPLETED', 'MAINTENANCE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_capacity_headroom CHECK (total_capacity >= (occupied_quantity + reserved_quantity)),
    CONSTRAINT uq_dept_resource UNIQUE (department_id, resource_type)
);

-- 5. EMERGENCY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS emergency_requests (
    id VARCHAR(50) PRIMARY KEY,
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    priority VARCHAR(20) NOT NULL 
        CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    incident_category VARCHAR(50) NOT NULL 
        CHECK (incident_category IN ('TRAUMA', 'CARDIAC', 'RESPIRATORY', 'MASS_CASUALTY', 'BLOOD_URGENCY')),
    patient_reference VARCHAR(100) NOT NULL,
    requester_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    requester_name VARCHAR(150) NOT NULL,
    requester_contact VARCHAR(50) NOT NULL,
    incident_latitude DOUBLE PRECISION NOT NULL,
    incident_longitude DOUBLE PRECISION NOT NULL,
    incident_address TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'MATCHED', 'DISPATCHED', 'ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'CANCELLED')),
    assigned_hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

-- 6. REQUEST RESOURCES TABLE (Emergency Request -> Required Resources)
CREATE TABLE IF NOT EXISTS request_resources (
    id VARCHAR(50) PRIMARY KEY,
    emergency_request_id VARCHAR(50) NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    required_quantity INTEGER NOT NULL CHECK (required_quantity > 0),
    fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'UNFULFILLED' 
        CHECK (status IN ('UNFULFILLED', 'RESERVED', 'ALLOCATED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_request_resource UNIQUE (emergency_request_id, resource_type)
);

-- 7. RESERVATIONS TABLE (Emergency Request -> Reservations -> Hospital Resources)
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(50) PRIMARY KEY,
    emergency_request_id VARCHAR(50) NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
    reserved_quantity INTEGER NOT NULL CHECK (reserved_quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'HELD' 
        CHECK (status IN ('HELD', 'CONFIRMED', 'CONSUMED', 'RELEASED', 'EXPIRED')),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    notes TEXT
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO' 
        CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO', 'SUCCESS')),
    target_role VARCHAR(50),
    target_hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    reference_emergency_id VARCHAR(50) REFERENCES emergency_requests(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. RESOURCE UPDATES AUDIT TABLE
CREATE TABLE IF NOT EXISTS resource_updates (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    hospital_id VARCHAR(50) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    previous_capacity INTEGER NOT NULL,
    new_capacity INTEGER NOT NULL,
    previous_occupied INTEGER NOT NULL,
    new_occupied INTEGER NOT NULL,
    previous_reserved INTEGER NOT NULL,
    new_reserved INTEGER NOT NULL,
    change_reason VARCHAR(100) NOT NULL,
    updated_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================

-- Hospitals
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);
CREATE INDEX IF NOT EXISTS idx_hospitals_trauma ON hospitals(trauma_level);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);

-- Departments
CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments(hospital_id);

-- Resources
CREATE INDEX IF NOT EXISTS idx_resources_hospital ON resources(hospital_id);
CREATE INDEX IF NOT EXISTS idx_resources_department ON resources(department_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_available ON resources(available_quantity);

-- Emergency Requests
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_priority ON emergency_requests(priority);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_hospital ON emergency_requests(assigned_hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_created ON emergency_requests(created_at DESC);

-- Request Resources
CREATE INDEX IF NOT EXISTS idx_request_resources_request ON request_resources(emergency_request_id);

-- Reservations
CREATE INDEX IF NOT EXISTS idx_reservations_request ON reservations(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hospital ON reservations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reservations_resource ON reservations(resource_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_hospital ON notifications(target_hospital_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = FALSE;

-- Resource Updates
CREATE INDEX IF NOT EXISTS idx_resource_updates_resource ON resource_updates(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_updates_created ON resource_updates(created_at DESC);
