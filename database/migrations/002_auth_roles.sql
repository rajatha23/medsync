-- ====================================================================
-- Migration 002: Add COORDINATOR and HOSPITAL_ADMIN Roles to Users Table
-- ====================================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('COORDINATOR', 'HOSPITAL_ADMIN', 'ADMIN', 'REGIONAL_COORDINATOR', 'HOSPITAL_COORDINATOR', 'PARAMEDIC'));
