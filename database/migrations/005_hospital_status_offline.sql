-- Migration 005: Add OFFLINE to hospitals_status_check constraint
ALTER TABLE hospitals DROP CONSTRAINT IF EXISTS hospitals_status_check;
ALTER TABLE hospitals ADD CONSTRAINT hospitals_status_check 
    CHECK (status IN ('NORMAL', 'SURGE', 'DIVERT', 'LOCKDOWN', 'OFFLINE', 'CLOSED'));
