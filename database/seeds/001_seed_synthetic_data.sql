-- ====================================================================
-- MEDSYNC: Smart Hospital Resource Coordination Platform
-- Seed Data: Synthetic Regional Healthcare Network (6 Hospitals)
-- ====================================================================

-- Clean existing data in reverse foreign key order
TRUNCATE TABLE resource_updates CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE reservations CASCADE;
TRUNCATE TABLE request_resources CASCADE;
TRUNCATE TABLE emergency_requests CASCADE;
TRUNCATE TABLE resources CASCADE;
TRUNCATE TABLE departments CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE hospitals CASCADE;

-- --------------------------------------------------------------------
-- 1. HOSPITALS (6 Diverse Regional Facilities)
-- --------------------------------------------------------------------
INSERT INTO hospitals (id, name, code, tier, trauma_level, address, city, latitude, longitude, contact_phone, contact_email, status)
VALUES
('hosp-metro-01', 'Metropolitan Trauma & University Hospital', 'METRO-01', 'Tertiary Referral', 'Level 1', '742 University Ave, Downtown', 'Metropolis', 40.7128, -74.0060, '+1 (555) 019-2831', 'dispatch@metrohealth.demo', 'NORMAL'),
('hosp-stjude-02', 'St. Jude Regional Medical Center', 'STJUDE-02', 'Regional Core', 'Level 2', '1204 Oakwood Pkwy, East District', 'Metropolis', 40.7306, -73.9866, '+1 (555) 028-4921', 'coordination@stjude.demo', 'SURGE'),
('hosp-apex-03', 'Apex Memorial Emergency Center', 'APEX-03', 'Surgical Specialty', 'Level 2', '890 Riverside Dr, Westside', 'Metropolis', 40.7484, -73.9857, '+1 (555) 037-8812', 'triage@apexmemorial.demo', 'NORMAL'),
('hosp-green-04', 'Green Valley Pediatric & Women''s Hospital', 'GREEN-04', 'Pediatric Specialty', 'Specialized', '310 Blossom Hill Rd, North Park', 'Metropolis', 40.7829, -73.9654, '+1 (555) 046-7734', 'pediatrics@greenvalley.demo', 'NORMAL'),
('hosp-westside-05', 'Westside Blood & Critical Depository', 'WESTSIDE-05', 'Central Blood Hub', 'Community', '45 Industrial Pkwy, Harbor Zone', 'Metropolis', 40.7028, -74.0160, '+1 (555) 055-1290', 'bloodbank@westside.demo', 'NORMAL'),
('hosp-northshore-06', 'Northshore Emergency Satellite Outpost', 'NORTH-06', 'Suburban Satellite', 'Community', '2210 Pinecrest Blvd, North Hills', 'Metropolis', 40.8128, -73.9460, '+1 (555) 064-9988', 'outpost@northshore.demo', 'DIVERT');

-- --------------------------------------------------------------------
-- 2. USERS (Roles: COORDINATOR, HOSPITAL_ADMIN, ADMIN, PARAMEDIC)
-- Default Password for all demo accounts: Password123!
-- Bcrypt Hash: $2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2
-- --------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, hospital_id, phone, is_active)
VALUES
('usr-coord-01', 'Marcus Drake', 'coordinator@medsync.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'COORDINATOR', NULL, '+1 (555) 901-0002', true),
('usr-metro-01', 'Sarah Jenkins, RN', 'admin.metro@medsync.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'HOSPITAL_ADMIN', 'hosp-metro-01', '+1 (555) 901-0003', true),
('usr-stjude-01', 'Dr. Robert Chen', 'admin.stjude@medsync.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'HOSPITAL_ADMIN', 'hosp-stjude-02', '+1 (555) 901-0004', true),
('usr-apex-01', 'Dr. Gregory House', 'admin.apex@medsync.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'HOSPITAL_ADMIN', 'hosp-apex-03', '+1 (555) 901-0007', true),
('usr-admin-01', 'Dr. Evelyn Vance', 'admin@medsync.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'ADMIN', NULL, '+1 (555) 901-0001', true),
('usr-paramedic-01', 'Carlos Morales (Unit 12)', 'paramedic@medsync.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'PARAMEDIC', NULL, '+1 (555) 901-0005', true),
('usr-paramedic-02', 'Priya Nair (Air-Evac 4)', 'priya.n@metrodispatch.demo', '$2b$10$wMQbxdZkDU/s35bSzknheuAU5YeO9S2oOvOoMHtPFR2TM62YVUXY2', 'PARAMEDIC', NULL, '+1 (555) 901-0006', true);

-- --------------------------------------------------------------------
-- 3. DEPARTMENTS
-- --------------------------------------------------------------------
INSERT INTO departments (id, hospital_id, name, department_code, head_name, floor_location, contact_number)
VALUES
-- Metro Trauma Hospital
('dept-m1-emg', 'hosp-metro-01', 'Emergency & Trauma Department', 'ED-TRAUMA', 'Dr. Liam Vance', 'Ground Floor (North Wing)', '+1 (555) 019-2832'),
('dept-m1-icu', 'hosp-metro-01', 'Intensive Care Unit (ICU)', 'ICU-CRIT', 'Dr. Aris Thorne', 'Floor 3', '+1 (555) 019-2833'),
('dept-m1-gen', 'hosp-metro-01', 'General Inpatient Ward', 'GEN-WARD', 'Nurse Lead Miller', 'Floor 4 & 5', '+1 (555) 019-2834'),
('dept-m1-bld', 'hosp-metro-01', 'Transfusion & Blood Bank', 'BLOOD-BANK', 'Dr. Helena Roy', 'Basement Level 1', '+1 (555) 019-2835'),
('dept-m1-eqp', 'hosp-metro-01', 'Biomedical Equipment Depository', 'BIOMED-EQP', 'Eng. David Ross', 'Basement Level 2', '+1 (555) 019-2836'),

-- St. Jude Regional
('dept-s2-emg', 'hosp-stjude-02', 'Emergency Services', 'ED-STJUDE', 'Dr. Samantha Wu', 'Ground Floor', '+1 (555) 028-4922'),
('dept-s2-icu', 'hosp-stjude-02', 'Critical Care & ICU', 'ICU-STJUDE', 'Dr. Alan Gray', 'Floor 2', '+1 (555) 028-4923'),
('dept-s2-gen', 'hosp-stjude-02', 'Internal Medicine Ward', 'GEN-STJUDE', 'Nurse Lead Davis', 'Floor 3', '+1 (555) 028-4924'),
('dept-s2-bld', 'hosp-stjude-02', 'St. Jude Blood Depository', 'BLOOD-STJUDE', 'Dr. Karen White', 'Ground Floor East', '+1 (555) 028-4925'),
('dept-s2-eqp', 'hosp-stjude-02', 'Equipment & Respiratory Care', 'EQP-STJUDE', 'Eng. Leo Torres', 'Floor 1', '+1 (555) 028-4926'),

-- Apex Memorial
('dept-a3-emg', 'hosp-apex-03', 'Apex Emergency Triage', 'ED-APEX', 'Dr. Gregory House', 'Wing A Ground', '+1 (555) 037-8813'),
('dept-a3-icu', 'hosp-apex-03', 'Surgical ICU', 'SICU-APEX', 'Dr. Allison Cameron', 'Wing B Floor 2', '+1 (555) 037-8814'),
('dept-a3-gen', 'hosp-apex-03', 'Acute Recovery Ward', 'GEN-APEX', 'Nurse Lead Adams', 'Wing B Floor 3', '+1 (555) 037-8815'),
('dept-a3-bld', 'hosp-apex-03', 'Apex Transfusion Services', 'BLOOD-APEX', 'Dr. Robert Chase', 'Wing A Basement', '+1 (555) 037-8816'),
('dept-a3-eqp', 'hosp-apex-03', 'Critical Care Devices', 'EQP-APEX', 'Eng. Chris Cole', 'Wing B Basement', '+1 (555) 037-8817'),

-- Green Valley Pediatric
('dept-g4-emg', 'hosp-green-04', 'Pediatric Emergency Care', 'ED-PEDS', 'Dr. Claire Redfield', 'Ground Floor Central', '+1 (555) 046-7735'),
('dept-g4-icu', 'hosp-green-04', 'Pediatric Intensive Care (PICU)', 'PICU-GREEN', 'Dr. Leon Kennedy', 'Floor 3', '+1 (555) 046-7736'),
('dept-g4-gen', 'hosp-green-04', 'Youth Inpatient Pavilion', 'GEN-PEDS', 'Nurse Lead Valentine', 'Floor 2', '+1 (555) 046-7737'),
('dept-g4-bld', 'hosp-green-04', 'Pediatric Blood Bank', 'BLOOD-PEDS', 'Dr. Ada Wong', 'Basement', '+1 (555) 046-7738'),
('dept-g4-eqp', 'hosp-green-04', 'Neonatal & Pediatric Equipment', 'EQP-PEDS', 'Eng. Barry Burton', 'Floor 1', '+1 (555) 046-7739'),

-- Westside Blood Center
('dept-w5-bld', 'hosp-westside-05', 'Metropolitan Central Blood Depository', 'BLOOD-CENTRAL', 'Director Nathan Cross', 'Main Depository', '+1 (555) 055-1291'),
('dept-w5-eqp', 'hosp-westside-05', 'Apheresis & Storage Infrastructure', 'EQP-COLD', 'Eng. Maya Lin', 'Storage Wing', '+1 (555) 055-1292'),

-- Northshore Satellite
('dept-n6-emg', 'hosp-northshore-06', 'Suburban Urgent Care & Triage', 'ED-NORTH', 'Dr. Samuel Hayes', 'Ground Floor', '+1 (555) 064-9989'),
('dept-n6-icu', 'hosp-northshore-06', 'Stabilization ICU (Holding)', 'ICU-NORTH', 'Dr. Diane Foster', 'Floor 1', '+1 (555) 064-9990'),
('dept-n6-gen', 'hosp-northshore-06', 'Observation Beds', 'GEN-NORTH', 'Nurse Lead Scott', 'Floor 2', '+1 (555) 064-9991');

-- --------------------------------------------------------------------
-- 4. RESOURCES (ICU Beds, General Beds, Emergency Bays, Blood, Ventilators)
-- --------------------------------------------------------------------
INSERT INTO resources (id, hospital_id, department_id, category, resource_type, total_capacity, occupied_quantity, reserved_quantity, critical_threshold, unit_of_measure, status)
VALUES
-- Metro Trauma Hospital (Large capacity, healthy buffer)
('res-m1-icu', 'hosp-metro-01', 'dept-m1-icu', 'BED', 'ICU_BED', 30, 14, 2, 5, 'beds', 'AVAILABLE'),
('res-m1-gen', 'hosp-metro-01', 'dept-m1-gen', 'BED', 'GENERAL_BED', 180, 85, 5, 20, 'beds', 'AVAILABLE'),
('res-m1-ped', 'hosp-metro-01', 'dept-m1-gen', 'BED', 'PEDIATRIC_BED', 20, 11, 1, 3, 'beds', 'AVAILABLE'),
('res-m1-bay', 'hosp-metro-01', 'dept-m1-emg', 'EMERGENCY_CAPACITY', 'AMBULANCE_BAY', 12, 5, 1, 2, 'bays', 'AVAILABLE'),
('res-m1-res', 'hosp-metro-01', 'dept-m1-emg', 'EMERGENCY_CAPACITY', 'RESUSCITATION_STATION', 6, 2, 0, 1, 'stations', 'AVAILABLE'),
('res-m1-b-oneg', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_O_NEG', 25, 10, 3, 10, 'units', 'AVAILABLE'),
('res-m1-b-opos', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_O_POS', 50, 18, 2, 15, 'units', 'AVAILABLE'),
('res-m1-b-aneg', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_A_NEG', 20, 8, 1, 8, 'units', 'AVAILABLE'),
('res-m1-b-apos', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_A_POS', 45, 12, 0, 10, 'units', 'AVAILABLE'),
('res-m1-b-bneg', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_B_NEG', 15, 6, 0, 5, 'units', 'AVAILABLE'),
('res-m1-b-bpos', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_B_POS', 35, 14, 0, 10, 'units', 'AVAILABLE'),
('res-m1-b-abneg', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_AB_NEG', 10, 4, 0, 4, 'units', 'AVAILABLE'),
('res-m1-b-abpos', 'hosp-metro-01', 'dept-m1-bld', 'BLOOD', 'BLOOD_AB_POS', 20, 7, 0, 5, 'units', 'AVAILABLE'),
('res-m1-vent', 'hosp-metro-01', 'dept-m1-eqp', 'EQUIPMENT', 'VENTILATOR', 24, 14, 2, 4, 'devices', 'AVAILABLE'),
('res-m1-dial', 'hosp-metro-01', 'dept-m1-eqp', 'EQUIPMENT', 'DIALYSIS_MACHINE', 8, 5, 0, 2, 'devices', 'AVAILABLE'),

-- St. Jude Regional (SURGE - Near capacity)
('res-s2-icu', 'hosp-stjude-02', 'dept-s2-icu', 'BED', 'ICU_BED', 20, 16, 1, 4, 'beds', 'LOW_STOCK'),
('res-s2-gen', 'hosp-stjude-02', 'dept-s2-gen', 'BED', 'GENERAL_BED', 120, 94, 4, 15, 'beds', 'AVAILABLE'),
('res-s2-bay', 'hosp-stjude-02', 'dept-s2-emg', 'EMERGENCY_CAPACITY', 'AMBULANCE_BAY', 8, 6, 1, 2, 'bays', 'LOW_STOCK'),
('res-s2-b-oneg', 'hosp-stjude-02', 'dept-s2-bld', 'BLOOD', 'BLOOD_O_NEG', 12, 7, 1, 8, 'units', 'LOW_STOCK'),
('res-s2-b-opos', 'hosp-stjude-02', 'dept-s2-bld', 'BLOOD', 'BLOOD_O_POS', 30, 22, 0, 10, 'units', 'AVAILABLE'),
('res-s2-b-apos', 'hosp-stjude-02', 'dept-s2-bld', 'BLOOD', 'BLOOD_A_POS', 25, 18, 0, 8, 'units', 'AVAILABLE'),
('res-s2-b-bpos', 'hosp-stjude-02', 'dept-s2-bld', 'BLOOD', 'BLOOD_B_POS', 20, 15, 0, 5, 'units', 'AVAILABLE'),
('res-s2-vent', 'hosp-stjude-02', 'dept-s2-eqp', 'EQUIPMENT', 'VENTILATOR', 15, 12, 1, 3, 'devices', 'LOW_STOCK'),

-- Apex Memorial (Balanced surgical center)
('res-a3-icu', 'hosp-apex-03', 'dept-a3-icu', 'BED', 'ICU_BED', 25, 14, 2, 4, 'beds', 'AVAILABLE'),
('res-a3-gen', 'hosp-apex-03', 'dept-a3-gen', 'BED', 'GENERAL_BED', 140, 72, 4, 15, 'beds', 'AVAILABLE'),
('res-a3-bay', 'hosp-apex-03', 'dept-a3-emg', 'EMERGENCY_CAPACITY', 'AMBULANCE_BAY', 10, 4, 1, 2, 'bays', 'AVAILABLE'),
('res-a3-b-oneg', 'hosp-apex-03', 'dept-a3-bld', 'BLOOD', 'BLOOD_O_NEG', 18, 9, 1, 6, 'units', 'AVAILABLE'),
('res-a3-b-opos', 'hosp-apex-03', 'dept-a3-bld', 'BLOOD', 'BLOOD_O_POS', 35, 16, 0, 10, 'units', 'AVAILABLE'),
('res-a3-vent', 'hosp-apex-03', 'dept-a3-eqp', 'EQUIPMENT', 'VENTILATOR', 18, 11, 2, 3, 'devices', 'AVAILABLE'),

-- Green Valley Pediatric (Children specialized)
('res-g4-icu', 'hosp-green-04', 'dept-g4-icu', 'BED', 'ICU_BED', 18, 8, 1, 3, 'beds', 'AVAILABLE'),
('res-g4-gen', 'hosp-green-04', 'dept-g4-gen', 'BED', 'GENERAL_BED', 90, 42, 2, 10, 'beds', 'AVAILABLE'),
('res-g4-b-oneg', 'hosp-green-04', 'dept-g4-bld', 'BLOOD', 'BLOOD_O_NEG', 15, 4, 0, 5, 'units', 'AVAILABLE'),
('res-g4-vent', 'hosp-green-04', 'dept-g4-eqp', 'EQUIPMENT', 'VENTILATOR', 12, 5, 1, 2, 'devices', 'AVAILABLE'),

-- Westside Central Blood Depository (Bulk Blood Reserves)
('res-w5-b-oneg', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_O_NEG', 80, 22, 6, 25, 'units', 'AVAILABLE'),
('res-w5-b-opos', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_O_POS', 160, 45, 10, 40, 'units', 'AVAILABLE'),
('res-w5-b-aneg', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_A_NEG', 70, 20, 4, 20, 'units', 'AVAILABLE'),
('res-w5-b-apos', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_A_POS', 140, 38, 8, 30, 'units', 'AVAILABLE'),
('res-w5-b-bneg', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_B_NEG', 50, 15, 2, 15, 'units', 'AVAILABLE'),
('res-w5-b-bpos', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_B_POS', 110, 30, 5, 25, 'units', 'AVAILABLE'),
('res-w5-b-abneg', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_AB_NEG', 30, 8, 1, 10, 'units', 'AVAILABLE'),
('res-w5-b-abpos', 'hosp-westside-05', 'dept-w5-bld', 'BLOOD', 'BLOOD_AB_POS', 65, 18, 2, 15, 'units', 'AVAILABLE'),

-- Northshore Outpost (DIVERT - Constrained)
('res-n6-icu', 'hosp-northshore-06', 'dept-n6-icu', 'BED', 'ICU_BED', 6, 5, 1, 2, 'beds', 'DEPLETED'),
('res-n6-gen', 'hosp-northshore-06', 'dept-n6-gen', 'BED', 'GENERAL_BED', 30, 27, 3, 5, 'beds', 'DEPLETED'),
('res-n6-bay', 'hosp-northshore-06', 'dept-n6-emg', 'EMERGENCY_CAPACITY', 'AMBULANCE_BAY', 4, 3, 1, 1, 'bays', 'DEPLETED');

-- --------------------------------------------------------------------
-- 5. EMERGENCY REQUESTS (Active & Historical Incidents)
-- --------------------------------------------------------------------
INSERT INTO emergency_requests (id, tracking_code, priority, incident_category, patient_reference, requester_id, requester_name, requester_contact, incident_latitude, incident_longitude, incident_address, status, assigned_hospital_id, notes, created_at)
VALUES
('req-emg-101', 'MED-2026-101', 'CRITICAL', 'TRAUMA', 'ANON-PT-8021', 'usr-paramedic-01', 'Ambulance Unit 12', '+1 (555) 901-0005', 40.7200, -73.9950, 'Interstate 95 Exit 14, Mile Marker 82', 'DISPATCHED', 'hosp-metro-01', 'High-speed 3-vehicle collision. Severe chest trauma and hypovolemia.', NOW() - INTERVAL '18 minutes'),
('req-emg-102', 'MED-2026-102', 'HIGH', 'RESPIRATORY', 'ANON-PT-8022', 'usr-paramedic-02', 'Air-Evac Unit 4', '+1 (555) 901-0006', 40.7550, -73.9780, 'Midtown Commercial Complex, 5th Ave', 'ACCEPTED', 'hosp-apex-03', 'Acute respiratory failure. Patient intubated in transit.', NOW() - INTERVAL '34 minutes'),
('req-emg-103', 'MED-2026-103', 'CRITICAL', 'BLOOD_URGENCY', 'ANON-PT-8023', 'usr-stjude-01', 'St. Jude ED Triage', '+1 (555) 901-0004', 40.7306, -73.9866, '1204 Oakwood Pkwy, East District', 'PENDING', NULL, 'Emergency GI hemorrhage, massive transfusion protocol activated. Need immediate O- units.', NOW() - INTERVAL '8 minutes');

-- --------------------------------------------------------------------
-- 6. REQUEST RESOURCES (Required Resources for Emergency Incidents)
-- --------------------------------------------------------------------
INSERT INTO request_resources (id, emergency_request_id, resource_type, required_quantity, fulfilled_quantity, status)
VALUES
('req-res-101-icu', 'req-emg-101', 'ICU_BED', 1, 1, 'RESERVED'),
('req-res-101-bld', 'req-emg-101', 'BLOOD_O_NEG', 2, 2, 'RESERVED'),
('req-res-101-vnt', 'req-emg-101', 'VENTILATOR', 1, 1, 'RESERVED'),

('req-res-102-icu', 'req-emg-102', 'ICU_BED', 1, 1, 'ALLOCATED'),
('req-res-102-vnt', 'req-emg-102', 'VENTILATOR', 1, 1, 'ALLOCATED'),

('req-res-103-bld', 'req-emg-103', 'BLOOD_O_NEG', 4, 0, 'UNFULFILLED');

-- --------------------------------------------------------------------
-- 7. RESERVATIONS (Held assets preventing double-booking)
-- --------------------------------------------------------------------
INSERT INTO reservations (id, emergency_request_id, hospital_id, resource_id, reserved_quantity, status, reserved_at, expires_at, notes)
VALUES
('resv-101-icu', 'req-emg-101', 'hosp-metro-01', 'res-m1-icu', 1, 'HELD', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '45 minutes', 'Held for incoming trauma arrival Unit 12'),
('resv-101-bld', 'req-emg-101', 'hosp-metro-01', 'res-m1-b-oneg', 2, 'HELD', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '45 minutes', 'Prepared in trauma bay refrigerator'),
('resv-101-vnt', 'req-emg-101', 'hosp-metro-01', 'res-m1-vent', 1, 'HELD', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '45 minutes', 'Pre-checked in Trauma Bay 1'),

('resv-102-icu', 'req-emg-102', 'hosp-apex-03', 'res-a3-icu', 1, 'CONFIRMED', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '30 minutes', 'Confirmed by Apex triage coordinator'),
('resv-102-vnt', 'req-emg-102', 'hosp-apex-03', 'res-a3-vent', 1, 'CONFIRMED', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '30 minutes', 'Confirmed by Apex biomedical team');

-- --------------------------------------------------------------------
-- 8. NOTIFICATIONS (Live Alerts & Coordination Ticker)
-- --------------------------------------------------------------------
INSERT INTO notifications (title, message, severity, target_role, target_hospital_id, reference_emergency_id, is_read)
VALUES
('Critical Trauma Dispatch: MED-2026-101', 'Ambulance Unit 12 dispatched to Metropolitan Trauma. 1 ICU bed, 2 units O- blood, and 1 ventilator held on active reserve.', 'CRITICAL', 'HOSPITAL_COORDINATOR', 'hosp-metro-01', 'req-emg-101', false),
('Surge Alert: St. Jude Regional', 'St. Jude Regional has reached 80% ICU capacity. Automated dispatch load rebalancing activated.', 'WARNING', 'REGIONAL_COORDINATOR', 'hosp-stjude-02', NULL, false),
('Urgent Blood Request: MED-2026-103', 'St. Jude Emergency Department requested 4 units O- blood for GI hemorrhage trauma.', 'CRITICAL', 'REGIONAL_COORDINATOR', NULL, 'req-emg-103', false),
('Allocation Confirmed: MED-2026-102', 'Apex Memorial confirmed ICU bed and ventilator allocation for incoming patient from Air-Evac Unit 4.', 'SUCCESS', 'HOSPITAL_COORDINATOR', 'hosp-apex-03', 'req-emg-102', true),
('Facility Divert Notice: Northshore Outpost', 'Northshore Emergency Satellite Outpost entered DIVERT status due to 100% bed saturation.', 'WARNING', 'REGIONAL_COORDINATOR', 'hosp-northshore-06', NULL, true);

-- --------------------------------------------------------------------
-- 9. RESOURCE UPDATES AUDIT LOG
-- --------------------------------------------------------------------
INSERT INTO resource_updates (resource_id, hospital_id, previous_capacity, new_capacity, previous_occupied, new_occupied, previous_reserved, new_reserved, change_reason, updated_by_user_id)
VALUES
('res-m1-icu', 'hosp-metro-01', 30, 30, 14, 14, 1, 2, 'EMERGENCY_RESERVATION_HOLD', 'usr-coord-01'),
('res-m1-b-oneg', 'hosp-metro-01', 25, 25, 10, 10, 1, 3, 'EMERGENCY_RESERVATION_HOLD', 'usr-coord-01'),
('res-s2-icu', 'hosp-stjude-02', 20, 20, 15, 16, 0, 1, 'PATIENT_ADMISSION', 'usr-stjude-01'),
('res-a3-icu', 'hosp-apex-03', 25, 25, 14, 14, 1, 2, 'ALLOCATION_CONFIRMED', 'usr-admin-01');
