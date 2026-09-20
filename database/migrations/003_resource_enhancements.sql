-- ====================================================================
-- Migration 003: Hospital Resource Management Enhancements
-- ====================================================================

-- 1. Make department_id nullable (department_id if applicable)
ALTER TABLE resources ALTER COLUMN department_id DROP NOT NULL;

-- 2. Expand category check constraint
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_category_check;
ALTER TABLE resources ADD CONSTRAINT resources_category_check 
    CHECK (category IN ('BEDS', 'BLOOD', 'EQUIPMENT', 'CAPACITY', 'BED', 'EMERGENCY_CAPACITY'));

-- 3. Expand status check constraint to support AVAILABLE, LIMITED, CRITICAL, UNAVAILABLE
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_status_check;
ALTER TABLE resources ADD CONSTRAINT resources_status_check 
    CHECK (status IN ('AVAILABLE', 'LIMITED', 'CRITICAL', 'UNAVAILABLE', 'LOW_STOCK', 'DEPLETED', 'MAINTENANCE'));

-- 4. Normalize categories to BEDS, BLOOD, EQUIPMENT, CAPACITY
UPDATE resources SET category = 'BEDS' WHERE category = 'BED';
UPDATE resources SET category = 'CAPACITY' WHERE category = 'EMERGENCY_CAPACITY';

-- 5. Automatically calculate status according to Phase 5 rules
UPDATE resources 
SET status = CASE 
    WHEN available_quantity <= 0 THEN 'UNAVAILABLE'
    WHEN available_quantity <= critical_threshold THEN 'CRITICAL'
    WHEN available_quantity <= critical_threshold * 1.5 OR (total_capacity > 0 AND (available_quantity::numeric / total_capacity) <= 0.3) THEN 'LIMITED'
    ELSE 'AVAILABLE'
END;
