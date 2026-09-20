const logger = require('../utils/logger');
const { query } = require('../db');

const API_BASE = 'http://localhost:5000/api';

async function runDashboardTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      logger.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passed++;
    logger.info(`✅ PASS: ${message}`);
  }

  logger.info('==============================================================');
  logger.info('  RUNNING PHASE 6: COORDINATOR COMMAND CENTER TEST SUITE      ');
  logger.info('==============================================================');

  try {
    // 1. Unauthenticated request must return 401
    const unauthRes = await fetch(`${API_BASE}/dashboard/overview`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/dashboard/overview rejected with 401 Unauthorized');

    // 2. Authenticate Coordinator
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'coordinator@medsync.demo', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    assert(token !== undefined, 'Coordinator authenticated successfully');

    // 3. Authenticated request returns 200 OK
    const overviewRes = await fetch(`${API_BASE}/dashboard/overview`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(overviewRes.status === 200, 'Coordinator GET /api/dashboard/overview returns 200 OK');
    const body = await overviewRes.json();
    assert(body.success === true, 'Response contains success: true');
    const d = body.data;
    assert(d !== undefined, 'Response contains data payload');

    // 4. Verify all 10 required fields exist in payload
    assert(typeof d.total_hospitals === 'number', 'Payload contains total_hospitals (number)');
    assert(typeof d.operational_hospitals === 'number', 'Payload contains operational_hospitals (number)');
    assert(typeof d.available_icu_beds === 'number', 'Payload contains available_icu_beds (number)');
    assert(typeof d.available_general_beds === 'number', 'Payload contains available_general_beds (number)');
    assert(typeof d.emergency_capacity === 'object', 'Payload contains emergency_capacity (object)');
    assert(typeof d.emergency_capacity.available === 'number', 'emergency_capacity contains available (number)');
    assert(typeof d.available_ventilators === 'number', 'Payload contains available_ventilators (number)');
    assert(Array.isArray(d.blood_groups_below_threshold), 'Payload contains blood_groups_below_threshold (array)');
    assert(typeof d.active_emergency_requests === 'object', 'Payload contains active_emergency_requests (object)');
    assert(typeof d.hospital_status === 'object', 'Payload contains hospital_status (object)');
    assert(typeof d.resource_utilization === 'object', 'Payload contains resource_utilization (object)');
    assert(Array.isArray(d.critical_alerts), 'Payload contains critical_alerts (array)');

    // 5. Database Direct Verification - Total & Operational Hospitals
    const dbHosp = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status != 'OFFLINE') as operational
      FROM hospitals;
    `);
    const expectedTotalHosp = parseInt(dbHosp.rows[0].total, 10);
    const expectedOperHosp = parseInt(dbHosp.rows[0].operational, 10);
    assert(d.total_hospitals === expectedTotalHosp, `total_hospitals (${d.total_hospitals}) exactly matches database count (${expectedTotalHosp})`);
    assert(d.operational_hospitals === expectedOperHosp, `operational_hospitals (${d.operational_hospitals}) exactly matches database count (${expectedOperHosp})`);

    // 6. Database Direct Verification - Bed Capacities
    const dbBeds = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN available_quantity ELSE 0 END), 0) as avail_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN total_capacity ELSE 0 END), 0) as tot_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN available_quantity ELSE 0 END), 0) as avail_gen,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN total_capacity ELSE 0 END), 0) as tot_gen
      FROM resources;
    `);
    const expAvailIcu = parseInt(dbBeds.rows[0].avail_icu, 10);
    const expTotIcu = parseInt(dbBeds.rows[0].tot_icu, 10);
    const expAvailGen = parseInt(dbBeds.rows[0].avail_gen, 10);
    const expTotGen = parseInt(dbBeds.rows[0].tot_gen, 10);

    assert(d.available_icu_beds === expAvailIcu, `available_icu_beds (${d.available_icu_beds}) exactly matches database sum (${expAvailIcu})`);
    assert(d.total_icu_beds === expTotIcu, `total_icu_beds (${d.total_icu_beds}) exactly matches database sum (${expTotIcu})`);
    assert(d.available_general_beds === expAvailGen, `available_general_beds (${d.available_general_beds}) exactly matches database sum (${expAvailGen})`);
    assert(d.total_general_beds === expTotGen, `total_general_beds (${d.total_general_beds}) exactly matches database sum (${expTotGen})`);

    // 7. Database Direct Verification - Emergency Capacity & Ventilators
    const dbEquip = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN category IN ('CAPACITY', 'EMERGENCY_CAPACITY') THEN available_quantity ELSE 0 END), 0) as avail_cap,
        COALESCE(SUM(CASE WHEN category IN ('CAPACITY', 'EMERGENCY_CAPACITY') THEN total_capacity ELSE 0 END), 0) as tot_cap,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN available_quantity ELSE 0 END), 0) as avail_vent,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN total_capacity ELSE 0 END), 0) as tot_vent
      FROM resources;
    `);
    const expAvailCap = parseInt(dbEquip.rows[0].avail_cap, 10);
    const expTotCap = parseInt(dbEquip.rows[0].tot_cap, 10);
    const expAvailVent = parseInt(dbEquip.rows[0].avail_vent, 10);
    const expTotVent = parseInt(dbEquip.rows[0].tot_vent, 10);

    assert(d.emergency_capacity.available === expAvailCap, `emergency_capacity.available (${d.emergency_capacity.available}) matches database (${expAvailCap})`);
    assert(d.emergency_capacity.total === expTotCap, `emergency_capacity.total (${d.emergency_capacity.total}) matches database (${expTotCap})`);
    assert(d.available_ventilators === expAvailVent, `available_ventilators (${d.available_ventilators}) matches database sum (${expAvailVent})`);
    assert(d.total_ventilators === expTotVent, `total_ventilators (${d.total_ventilators}) matches database sum (${expTotVent})`);

    // 8. Database Direct Verification - Blood Groups Below Threshold
    const dbBlood = await query(`
      SELECT COUNT(*) as count
      FROM resources
      WHERE category = 'BLOOD' AND available_quantity <= critical_threshold;
    `);
    const expBloodDeficit = parseInt(dbBlood.rows[0].count, 10);
    assert(d.blood_groups_below_threshold.length === expBloodDeficit, `blood_groups_below_threshold count (${d.blood_groups_below_threshold.length}) matches database deficit count (${expBloodDeficit})`);
    if (d.blood_groups_below_threshold.length > 0) {
      const firstB = d.blood_groups_below_threshold[0];
      assert(firstB.hospital_name !== undefined, 'Blood deficit item contains hospital_name');
      assert(firstB.resource_label !== undefined, 'Blood deficit item contains friendly resource_label');
      assert(firstB.available_quantity <= firstB.threshold, 'Blood deficit item verifies available_quantity <= threshold');
    }

    // 9. Database Direct Verification - Active Emergency Requests
    const dbEmg = await query(`
      SELECT COUNT(*) as active_count
      FROM emergency_requests
      WHERE status NOT IN ('COMPLETED', 'CANCELLED');
    `);
    const expActiveEmg = parseInt(dbEmg.rows[0].active_count, 10);
    assert(d.active_emergency_requests.total_active === expActiveEmg, `active_emergency_requests.total_active (${d.active_emergency_requests.total_active}) matches database count (${expActiveEmg})`);
    assert(Array.isArray(d.active_emergency_requests.list), 'active_emergency_requests includes full list');

    // 10. Verification of Hospital Status Breakdown
    const statusSum = d.hospital_status.summary;
    const totalByStatus = statusSum.NORMAL + statusSum.SURGE + statusSum.DIVERT + statusSum.OFFLINE;
    assert(totalByStatus === d.total_hospitals, `Hospital status breakdown sum (${totalByStatus}) equals total hospitals (${d.total_hospitals})`);
    assert(Array.isArray(d.hospital_status.hospitals), 'hospital_status contains detailed array of facilities');
    assert(d.hospital_status.hospitals.length === d.total_hospitals, 'Detailed hospital list includes all registered facilities');

    // 11. Verification of Resource Utilization Calculations
    const util = d.resource_utilization;
    assert(util.overall_bed_utilization >= 0 && util.overall_bed_utilization <= 100, `overall_bed_utilization (${util.overall_bed_utilization}%) is valid percentage`);
    assert(util.icu_utilization >= 0 && util.icu_utilization <= 100, `icu_utilization (${util.icu_utilization}%) is valid percentage`);
    assert(util.ventilator_utilization >= 0 && util.ventilator_utilization <= 100, `ventilator_utilization (${util.ventilator_utilization}%) is valid percentage`);
    assert(util.emergency_capacity_utilization >= 0 && util.emergency_capacity_utilization <= 100, `emergency_capacity_utilization (${util.emergency_capacity_utilization}%) is valid percentage`);

    // 12. Verification of Critical Alerts Feed
    assert(d.critical_alerts.length > 0, `Critical alerts feed generated (${d.critical_alerts.length} live active alerts)`);
    const sampleAlert = d.critical_alerts[0];
    assert(sampleAlert.title !== undefined, 'Alert contains title');
    assert(sampleAlert.message !== undefined, 'Alert contains detailed message');
    assert(['CRITICAL', 'WARNING', 'INFO'].includes(sampleAlert.type), `Alert type is valid (${sampleAlert.type})`);

    logger.info('==============================================================');
    logger.info(`  PHASE 6 TEST RESULTS: ${passed}/${total} TESTS PASSED        `);
    logger.info('==============================================================');

    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    logger.error(`Dashboard test suite failed: ${err.message}`);
    setTimeout(() => process.exit(1), 100);
  }
}

runDashboardTests();
