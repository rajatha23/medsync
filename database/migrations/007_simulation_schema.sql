-- Migration 007: Emergency Scenario Simulator & Synthetic Data Tracking
-- Adds flags and indexing to safely distinguish synthetic simulations from real emergencies

-- 1. Add is_synthetic to emergency_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_requests' AND column_name = 'is_synthetic'
    ) THEN
        ALTER TABLE emergency_requests ADD COLUMN is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 2. Add is_synthetic to reservations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'is_synthetic'
    ) THEN
        ALTER TABLE reservations ADD COLUMN is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 3. Indexes for fast synthetic vs live filtering
CREATE INDEX IF NOT EXISTS idx_emg_requests_synthetic ON emergency_requests(is_synthetic);
CREATE INDEX IF NOT EXISTS idx_reservations_synthetic ON reservations(is_synthetic);
