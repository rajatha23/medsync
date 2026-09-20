-- ====================================================================
-- Migration 004: Emergency Request Workflow Enhancements (Phase 7)
-- ====================================================================

-- 1. Ensure priority constraint supports LOW, MEDIUM, HIGH, CRITICAL
ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_priority_check;
ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_priority_check 
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- 2. Update status check constraint to support Phase 7 lifecycle
ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_status_check;
ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_status_check 
    CHECK (status IN (
        'SEARCHING', 
        'MATCH_FOUND', 
        'PENDING_ACCEPTANCE', 
        'ACCEPTED', 
        'RESERVED', 
        'ALLOCATED', 
        'COMPLETED', 
        'CANCELLED',
        'PENDING', 
        'MATCHED', 
        'DISPATCHED', 
        'EN_ROUTE'
    ));

-- 3. Add updated_at column to emergency_requests if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_requests' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE emergency_requests ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 4. Normalize legacy seed statuses to Phase 7 workflow
UPDATE emergency_requests SET status = 'SEARCHING' WHERE status = 'PENDING';
UPDATE emergency_requests SET status = 'MATCH_FOUND' WHERE status = 'MATCHED';
UPDATE emergency_requests SET status = 'PENDING_ACCEPTANCE' WHERE status = 'DISPATCHED';
UPDATE emergency_requests SET status = 'ALLOCATED' WHERE status = 'EN_ROUTE';

-- 5. Create emergency_status_history audit trail for the status timeline visualizer
CREATE TABLE IF NOT EXISTS emergency_status_history (
    id SERIAL PRIMARY KEY,
    emergency_request_id VARCHAR(50) NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    notes TEXT,
    changed_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emg_status_history_req ON emergency_status_history(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_emg_status_history_created ON emergency_status_history(created_at);

-- 6. Populate baseline history for existing requests
INSERT INTO emergency_status_history (emergency_request_id, previous_status, new_status, notes, created_at)
SELECT id, NULL, status, 'Initial triage incident registration', created_at
FROM emergency_requests
WHERE id NOT IN (SELECT DISTINCT emergency_request_id FROM emergency_status_history);
