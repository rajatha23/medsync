/**
 * Emergency Scenario Simulator Test Suite
 * Validates:
 * 1. Read-only in-memory simulation projections (verifies zero database mutations)
 * 2. Input validation for cases and resource demand parameters
 * 3. Accuracy of BEFORE vs AFTER telemetry and shortage calculations
 * 4. Affected hospitals status shift projections (NORMAL -> SURGE -> DIVERT)
 * 5. Generation of synthetic emergency requests (SIM- tracking codes, priorities, resources)
 * 6. Generation of shortage alerts under network stress
 * 7. Explicit "Apply Simulation" transaction (commits synthetic requests and holds to DB)
 * 8. "Cleanup Simulation" rollback (safely cancels synthetic dispatches and restores inventory)
 * 9. Authorization checks (COORDINATOR vs HOSPITAL_ADMIN vs unauthenticated)
 */
const http = require('http');
const { query } = require('../db');

let passedTests = 0;
let failedTests = 0;

function logPass(msg) {
  console.log(`\x1b[32m✅ PASS:\x1b[0m ${msg}`);
  passedTests++;
}

function logFail(msg, err) {
  console.error(`\x1b[31m❌ FAIL:\x1b[0m ${msg}`);
  if (err) console.error(err);
  failedTests++;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  logPass(message);
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const parsed = resData ? JSON.parse(resData) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('\n==============================================================');
  console.log('  RUNNING EMERGENCY SCENARIO SIMULATOR TEST SUITE             ');
  console.log('==============================================================');

  try {
    // 1. Authenticate users
    const unauthRun = await makeRequest('POST', '/simulation/run', { casesCount: 10 });
    assert(unauthRun.status === 401, 'Unauthenticated POST /api/simulation/run rejected with 401');

    const adminLogin = await makeRequest('POST', '/auth/login', {
      email: 'admin.metro@medsync.demo',
      password: 'Password123!'
    });
    const adminToken = adminLogin.data?.data?.token;

    const hospAdminRun = await makeRequest('POST', '/simulation/run', { casesCount: 10 }, adminToken);
    assert(hospAdminRun.status === 403, 'Hospital Admin POST /api/simulation/run rejected with 403 Forbidden');

    const coordLogin = await makeRequest('POST', '/auth/login', {
      email: 'coordinator@medsync.demo',
      password: 'Password123!'
    });
    assert(coordLogin.status === 200, 'Coordinator authenticated successfully');
    const coordToken = coordLogin.data?.data?.token;

    // 2. Test Input Validation
    const invalidCases = await makeRequest('POST', '/simulation/run', { casesCount: -5 }, coordToken);
    assert(invalidCases.status === 400, 'Negative casesCount rejected with 400 Bad Request');

    const zeroCases = await makeRequest('POST', '/simulation/run', { casesCount: 0 }, coordToken);
    assert(zeroCases.status === 400, 'Zero casesCount rejected with 400 Bad Request');

    const negativeDemand = await makeRequest('POST', '/simulation/run', { casesCount: 10, icuDemand: -2 }, coordToken);
    assert(negativeDemand.status === 400, 'Negative icuDemand rejected with 400 Bad Request');

    // 3. Verify Read-Only Baseline Telemetry & Invariant Database State
    const emgCountBeforeRes = await query('SELECT COUNT(*) FROM emergency_requests;');
    const emgCountBefore = parseInt(emgCountBeforeRes.rows[0].count, 10);

    const resvCountBeforeRes = await query('SELECT COUNT(*) FROM reservations;');
    const resvCountBefore = parseInt(resvCountBeforeRes.rows[0].count, 10);

    const resvQtyBeforeRes = await query('SELECT SUM(reserved_quantity) as total_resv FROM resources;');
    const resvQtyBefore = parseInt(resvQtyBeforeRes.rows[0].total_resv || '0', 10);

    // Run in-memory simulation with substantial demand
    const simRes = await makeRequest('POST', '/simulation/run', {
      scenarioName: 'Test Mass Casualty Incident',
      casesCount: 25,
      icuDemand: 15,
      generalBedDemand: 25,
      ventilatorDemand: 10,
      bloodDemand: 30,
      incidentCategory: 'MASS_CASUALTY',
      location: 'Metropolis Harbor District'
    }, coordToken);

    assert(simRes.status === 200, 'POST /api/simulation/run returns 200 OK');
    const simData = simRes.data?.data;
    assert(simData.is_simulation === true, 'Response stamped with is_simulation = true');
    assert(simData.mode === 'SYNTHETIC_SIMULATION', 'Response explicitly marks mode as SYNTHETIC_SIMULATION');

    // VERIFY ZERO DATABASE MODIFICATIONS
    const emgCountAfterRes = await query('SELECT COUNT(*) FROM emergency_requests;');
    const emgCountAfter = parseInt(emgCountAfterRes.rows[0].count, 10);
    assert(emgCountBefore === emgCountAfter, `Database verified unaltered: emergency_requests count remained exactly ${emgCountBefore}`);

    const resvCountAfterRes = await query('SELECT COUNT(*) FROM reservations;');
    const resvCountAfter = parseInt(resvCountAfterRes.rows[0].count, 10);
    assert(resvCountBefore === resvCountAfter, `Database verified unaltered: reservations count remained exactly ${resvCountBefore}`);

    const resvQtyAfterRes = await query('SELECT SUM(reserved_quantity) as total_resv FROM resources;');
    const resvQtyAfter = parseInt(resvQtyAfterRes.rows[0].total_resv || '0', 10);
    assert(resvQtyBefore === resvQtyAfter, `Database verified unaltered: total reserved_quantity remained exactly ${resvQtyBefore}`);

    // 4. Test BEFORE vs AFTER Telemetry Calculations
    assert(simData.before !== undefined, 'Simulation payload contains before telemetry object');
    assert(simData.after !== undefined, 'Simulation payload contains after projected telemetry object');
    assert(simData.before.resources.icu_beds.available_quantity !== undefined, 'Before includes available ICU beds');
    assert(simData.after.resources.icu_beds.available_quantity !== undefined, 'After includes projected available ICU beds');
    assert(simData.after.resources.icu_beds.available_quantity <= simData.before.resources.icu_beds.available_quantity, 'Projected available ICU beds decreased');
    assert(simData.after.projected_bed_occupancy_rate >= simData.before.network_bed_occupancy_rate, 'Projected network bed occupancy rate increased or stayed equal');

    // 5. Test Shortage Calculation Accuracy
    assert(simData.projected_shortages !== undefined, 'Simulation payload contains projected_shortages object');
    const expectedIcuShortage = Math.max(0, 15 - simData.before.resources.icu_beds.available_quantity);
    assert(simData.projected_shortages.icu_beds_deficit === expectedIcuShortage, `ICU deficit accurately computed (${simData.projected_shortages.icu_beds_deficit} == ${expectedIcuShortage})`);

    // 6. Test Affected Hospitals Projection
    assert(Array.isArray(simData.affected_hospitals), 'Affected hospitals is an array');
    assert(simData.affected_hospitals.length > 0, `Returned ${simData.affected_hospitals.length} evaluated hospitals`);

    const offlineHosp = simData.affected_hospitals.find(h => h.is_offline === true);
    if (offlineHosp) {
      assert(offlineHosp.allocated_cases === 0, 'Offline hospital assigned 0 cases');
      assert(offlineHosp.status_changed === false, 'Offline hospital status does not shift');
    }

    const operationalHosp = simData.affected_hospitals.find(h => !h.is_offline);
    assert(operationalHosp !== undefined, 'Found at least one operational hospital');
    assert(operationalHosp.allocated_cases >= 0, 'Operational hospital allocated valid case count');
    assert(operationalHosp.projected_occupancy_rate >= 0, 'Operational hospital has valid projected occupancy');

    // 7. Test Synthetic Emergency Requests Generation
    assert(Array.isArray(simData.simulated_requests), 'simulated_requests is an array');
    assert(simData.simulated_requests.length === 25, `Generated exact requested number of simulated cases (${simData.simulated_requests.length} == 25)`);

    const sampleReq = simData.simulated_requests[0];
    assert(sampleReq.tracking_code.startsWith('SIM-REQ-'), `Tracking code has synthetic prefix (${sampleReq.tracking_code})`);
    assert(sampleReq.patient_reference.startsWith('SIM-PT-'), `Patient reference has synthetic code (${sampleReq.patient_reference})`);
    assert(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(sampleReq.priority), `Valid priority assigned (${sampleReq.priority})`);
    assert(sampleReq.is_synthetic === true, 'Request explicitly flagged is_synthetic = true');
    assert(sampleReq.notes.includes('[SYNTHETIC SIMULATION]'), 'Notes explicitly stamped with [SYNTHETIC SIMULATION]');
    assert(Array.isArray(sampleReq.demanded_resources), 'Case contains demanded resources array');
    assert(sampleReq.demanded_resources.length > 0, 'Case has at least one demanded resource');

    // 8. Test Shortage Alerts Generation
    assert(Array.isArray(simData.shortage_alerts), 'shortage_alerts is an array');
    if (simData.projected_shortages.has_shortages) {
      assert(simData.shortage_alerts.length > 0, 'Generated alerts for detected shortages');
      const shortageAlert = simData.shortage_alerts.find(a => a.type === 'CRITICAL');
      assert(shortageAlert !== undefined, 'Found CRITICAL shortage alert');
      assert(shortageAlert.title.includes('[SIMULATION]'), 'Shortage alert title has [SIMULATION] tag');
    }

    // 9. Test Extreme Overload Simulation
    const extremeSim = await makeRequest('POST', '/simulation/run', {
      scenarioName: 'Total Catastrophic Network Collapse',
      casesCount: 50,
      icuDemand: 1000,
      generalBedDemand: 2000,
      ventilatorDemand: 500,
      bloodDemand: 1000
    }, coordToken);

    assert(extremeSim.status === 200, 'Extreme overload simulation returns 200 OK');
    const extremeData = extremeSim.data?.data;
    assert(extremeData.projected_shortages.has_shortages === true, 'Extreme demand triggers has_shortages = true');
    assert(extremeData.projected_shortages.icu_beds_deficit > 0, 'Extreme demand has positive ICU deficit');
    assert(extremeData.projected_shortages.general_beds_deficit > 0, 'Extreme demand has positive General Bed deficit');
    assert(extremeData.after.resources.icu_beds.available_quantity === 0, 'Available ICU beds exhausted to 0');
    assert(extremeData.after.resources.general_beds.available_quantity === 0, 'Available General beds exhausted to 0');

    // Facilities should be pushed to DIVERT or SURGE
    const divertCount = extremeData.affected_hospitals.filter(h => h.projected_status === 'DIVERT').length;
    assert(divertCount > 0, `Extreme demand successfully projects facilities entering DIVERT status (found ${divertCount})`);

    // 10. Test Explicit "Apply Simulation" Transaction
    console.log('\n--- Testing Explicit Apply Simulation Transaction ---');
    // Generate a mini-simulation with 2 cases to apply
    const miniSimRes = await makeRequest('POST', '/simulation/run', {
      scenarioName: 'Mini Test Scenario',
      casesCount: 2,
      icuDemand: 1,
      generalBedDemand: 1,
      ventilatorDemand: 0,
      bloodDemand: 0
    }, coordToken);

    const miniSimData = miniSimRes.data?.data;
    const applyRes = await makeRequest('POST', '/simulation/apply', {
      scenario_name: miniSimData.scenario_name,
      simulation_id: miniSimData.simulation_id,
      simulated_requests: miniSimData.simulated_requests
    }, coordToken);

    assert(applyRes.status === 201, 'POST /api/simulation/apply returns 201 Created');
    assert(applyRes.data?.data?.applied === true, 'apply response indicates applied: true');
    assert(applyRes.data?.data?.emergency_requests_created === 2, 'Created exactly 2 synthetic emergency requests in DB');

    const createdIds = applyRes.data?.data?.created_request_ids || [];
    assert(createdIds.length === 2, 'Received created request IDs array');

    // Verify in PostgreSQL database
    const dbEmgCheck = await query(
      'SELECT id, tracking_code, is_synthetic, status FROM emergency_requests WHERE id = ANY($1)',
      [createdIds]
    );
    assert(dbEmgCheck.rows.length === 2, 'Verified 2 rows inserted in emergency_requests table');
    assert(dbEmgCheck.rows.every(r => r.is_synthetic === true), 'All inserted requests have is_synthetic = TRUE');
    assert(dbEmgCheck.rows.every(r => r.tracking_code.startsWith('SIM-REQ-')), 'All inserted requests have SIM-REQ- tracking code');

    // Check reservations created
    const dbResvCheck = await query(
      'SELECT id, emergency_request_id, is_synthetic, status, reserved_quantity FROM reservations WHERE emergency_request_id = ANY($1)',
      [createdIds]
    );
    assert(dbResvCheck.rows.length > 0, `Created ${dbResvCheck.rows.length} reservation holds in database`);
    assert(dbResvCheck.rows.every(r => r.is_synthetic === true), 'All created reservations have is_synthetic = TRUE');
    assert(dbResvCheck.rows.every(r => r.status === 'HELD'), 'All created reservations have status = HELD');

    // Check reservation_history
    const dbHistCheck = await query(
      'SELECT id, emergency_request_id, action, notes FROM reservation_history WHERE emergency_request_id = ANY($1)',
      [createdIds]
    );
    assert(dbHistCheck.rows.length > 0, 'Audit records created in reservation_history');
    assert(dbHistCheck.rows.some(h => h.notes.includes('[SYNTHETIC SIMULATION]')), 'History notes explicitly marked [SYNTHETIC SIMULATION]');

    // 11. Test "Cleanup Simulation" Rollback
    console.log('\n--- Testing Cleanup / Rollback of Synthetic Simulation ---');
    const cleanupRes = await makeRequest('POST', '/simulation/cleanup', {}, coordToken);
    assert(cleanupRes.status === 200, 'POST /api/simulation/cleanup returns 200 OK');
    assert(cleanupRes.data?.data?.cleaned_up === true, 'cleanup response indicates cleaned_up: true');
    assert(cleanupRes.data?.data?.released_reservations_count >= dbResvCheck.rows.length, 'Released all synthetic reservations');
    assert(cleanupRes.data?.data?.cancelled_requests_count >= 2, 'Cancelled synthetic emergency requests');

    // Verify synthetic reservations now CANCELLED in DB
    const dbResvAfterCleanup = await query(
      'SELECT id, status FROM reservations WHERE emergency_request_id = ANY($1)',
      [createdIds]
    );
    assert(dbResvAfterCleanup.rows.every(r => r.status === 'CANCELLED'), 'All synthetic reservations marked CANCELLED in database');

    // Verify synthetic emergency requests now CANCELLED in DB
    const dbEmgAfterCleanup = await query(
      'SELECT id, status FROM emergency_requests WHERE id = ANY($1)',
      [createdIds]
    );
    assert(dbEmgAfterCleanup.rows.every(r => r.status === 'CANCELLED'), 'All synthetic emergency requests marked CANCELLED in database');

    console.log('\n==============================================================');
    console.log(`  SIMULATION TEST RESULTS: ${passedTests} TESTS PASSED`);
    console.log('==============================================================\n');

    process.exit(0);
  } catch (err) {
    logFail('Simulation test failed with uncaught exception', err);
    console.error(err);
    process.exit(1);
  }
}

runTests();
