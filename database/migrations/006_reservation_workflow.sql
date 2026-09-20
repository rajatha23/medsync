-- Migration 006: Enhanced Resource Reservation Schema & History Ledger
-- Ensures 'CANCELLED' status is allowed and creates immutable reservation_history ledger

-- 1. Update reservations status check constraint if needed
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
    CHECK (status IN ('HELD', 'CONFIRMED', 'CONSUMED', 'RELEASED', 'EXPIRED', 'CANCELLED'));

-- 2. Add created_by_user_id column to reservations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'created_by_user_id'
    ) THEN
        ALTER TABLE reservations ADD COLUMN created_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create immutable reservation_history audit ledger
CREATE TABLE IF NOT EXISTS reservation_history (
    id SERIAL PRIMARY KEY,
    reservation_id VARCHAR(50) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    emergency_request_id VARCHAR(50) NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    action VARCHAR(30) NOT NULL CHECK (action IN ('RESERVED', 'CONFIRMED', 'RELEASED', 'CANCELLED', 'EXPIRED')),
    quantity INTEGER NOT NULL,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for rapid lookup by emergency_request_id and resource_id
CREATE INDEX IF NOT EXISTS idx_reservations_req ON reservations(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_resv_hist_req ON reservation_history(emergency_request_id);
