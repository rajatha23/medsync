/**
 * Phase 9: Resource Reservation Test Suite
 * Validates ACID transactions, row-level locking (FOR UPDATE),
 * simultaneous concurrent contention on a single ICU bed,
 * non-negative inventory invariants, cancellation/release, and audit history.
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
  console.log('  RUNNING PHASE 9: RESOURCE RESERVATION & CONCURRENCY SUITE   ');
  console.log('==============================================================');

  try {
    // 1. Authenticate Coordinator
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'coordinator@medsync.demo',
      password: 'Password123!'
    });
    assert(loginRes.status === 200 && loginRes.data?.data?.token, 'Coordinator authenticated successfully');
    const token = loginRes.data.data.token;

    // 2. Setup isolated hospital and SINGLE ICU bed resource
    const testHospitalId = 'hosp-stress-test';
    const testDeptId = 'dept-stress-icu';
    const singleIcuResourceId = 'res-single-icu-stress';

    await query(`
      INSERT INTO hospitals (id, name, code, tier, trauma_level, status, address, city, latitude, longitude, contact_phone, contact_email)
      VALUES ($1, 'Stress Testing Emergency Center', 'STRESS-ED', 'Regional', 'Level 1', 'NORMAL', '100 Stress Way', 'Metropolis', 40.7128, -74.0060, '+1 (555) 777-0001', 'stress@medsync.demo')
      ON CONFLICT (id) DO UPDATE SET status = 'NORMAL';
    `, [testHospitalId]);

    await query(`
      INSERT INTO departments (id, hospital_id, name, department_code, head_name)
      VALUES ($1, $2, 'Intensive Care Unit', 'ICU-STRESS', 'Dr. Lock')
      ON CONFLICT (id) DO NOTHING;
    `, [testDeptId, testHospitalId]);

    // Create single ICU bed with total_capacity = 1, occupied = 0, reserved = 0 -> available = 1
    await query(`
      INSERT INTO resources (
        id, hospital_id, department_id, category, resource_type,
        total_capacity, occupied_quantity, reserved_quantity, critical_threshold, unit_of_measure, status
      )
      VALUES ($1, $2, $3, 'BED', 'ICU_BED', 1, 0, 0, 1, 'beds', 'AVAILABLE')
      ON CONFLICT (id) DO UPDATE 
        SET total_capacity = 1,
            occupied_quantity = 0,
            reserved_quantity = 0,
            status = 'AVAILABLE';
    `, [singleIcuResourceId, testHospitalId, testDeptId]);

    // Verify database initial state: available_quantity === 1
    const initResCheck = await query('SELECT available_quantity, reserved_quantity, total_capacity FROM resources WHERE id = $1;', [singleIcuResourceId]);
    assert(initResCheck.rows[0].available_quantity === 1, 'Target ICU bed initialized with exactly 1 available unit');
    assert(initResCheck.rows[0].reserved_quantity === 0, 'Target ICU bed initialized with 0 reserved units');

    // 3. Create two independent emergency requests competing for this single bed
    const req1Res = await makeRequest('POST', '/emergency-requests', {
      location: '100 North Broadway, Metropolis',
      latitude: 40.7130,
      longitude: -74.0055,
      priority: 'CRITICAL',
      incident_category: 'CARDIAC',
      patient_reference: 'PT-CONCUR-1',
      notes: 'Competitor 1 for single ICU bed',
      required_resources: [{ resource_type: 'ICU_BED', required_quantity: 1 }]
    }, token);

    const req2Res = await makeRequest('POST', '/emergency-requests', {
      location: '200 South Broadway, Metropolis',
      latitude: 40.7125,
      longitude: -74.0065,
      priority: 'CRITICAL',
      incident_category: 'TRAUMA',
      patient_reference: 'PT-CONCUR-2',
      notes: 'Competitor 2 for single ICU bed',
      required_resources: [{ resource_type: 'ICU_BED', required_quantity: 1 }]
    }, token);

    assert(req1Res.status === 201 && req1Res.data?.data?.id, 'Emergency Request 1 created');
    assert(req2Res.status === 201 && req2Res.data?.data?.id, 'Emergency Request 2 created');

    const reqId1 = req1Res.data.data.id;
    const reqId2 = req2Res.data.data.id;

    // 4. THE CONCURRENCY TEST:
    // Fire simultaneous reservation attempts for the exact same single ICU bed
    console.log('\n--- Executing Simultaneous Concurrent Reservation Race ---');
    const [result1, result2] = await Promise.all([
      makeRequest('POST', '/reservations', {
        emergency_request_id: reqId1,
        hospital_id: testHospitalId,
        resource_id: singleIcuResourceId,
        quantity: 1,
        notes: 'Reservation attempt from Request 1'
      }, token),
      makeRequest('POST', '/reservations', {
        emergency_request_id: reqId2,
        hospital_id: testHospitalId,
        resource_id: singleIcuResourceId,
        quantity: 1,
        notes: 'Reservation attempt from Request 2'
      }, token)
    ]);

    const statuses = [result1.status, result2.status];
    const successCount = statuses.filter(s => s === 201).length;
    const conflictCount = statuses.filter(s => s === 409).length;

    assert(successCount === 1, `Exactly ONE reservation succeeded (got status 201 count = ${successCount})`);
    assert(conflictCount === 1, `The concurrent attempt was rejected with 409 Conflict (got status 409 count = ${conflictCount})`);

    const winnerResult = result1.status === 201 ? result1 : result2;
    const loserResult = result1.status === 409 ? result1 : result2;
    const winningRequestId = result1.status === 201 ? reqId1 : reqId2;
    const losingRequestId = result1.status === 409 ? reqId1 : reqId2;

    assert(
      loserResult.data?.error?.message?.includes('Insufficient available capacity') ||
      loserResult.data?.error?.message?.includes('Insufficient available resources'),
      'Conflict error explicitly cites insufficient available capacity'
    );

    const winningReservationId = winnerResult.data.data.reservation.id;
    assert(typeof winningReservationId === 'string', `Winner received reservation ID: ${winningReservationId}`);

    // 5. Verify Database Invariants After Race
    const postRaceCheck = await query('SELECT available_quantity, reserved_quantity, occupied_quantity, total_capacity FROM resources WHERE id = $1;', [singleIcuResourceId]);
    const postRaceRow = postRaceCheck.rows[0];

    assert(postRaceRow.available_quantity === 0, 'Available quantity decreased to exactly 0');
    assert(postRaceRow.available_quantity >= 0, 'Available quantity is strictly NOT below zero (never negative)');
    assert(postRaceRow.reserved_quantity === 1, 'Reserved quantity increased to exactly 1');
    assert(postRaceRow.occupied_quantity + postRaceRow.reserved_quantity <= postRaceRow.total_capacity, 'Headroom constraint preserved: occupied + reserved <= total');

    // 6. Verify Winning Emergency Request Status
    const winReqCheck = await query('SELECT status, assigned_hospital_id FROM emergency_requests WHERE id = $1;', [winningRequestId]);
    assert(winReqCheck.rows[0].status === 'RESERVED', 'Winning emergency request transitioned status to RESERVED');
    assert(winReqCheck.rows[0].assigned_hospital_id === testHospitalId, 'Winning emergency request assigned to receiving hospital');

    // 7. Verify Third Attempt also fails when 0 Available
    const req3Res = await makeRequest('POST', '/emergency-requests', {
      location: '300 West Broadway, Metropolis',
      latitude: 40.7140,
      longitude: -74.0040,
      priority: 'HIGH',
      incident_category: 'TRAUMA',
      patient_reference: 'PT-CONCUR-3',
      required_resources: [{ resource_type: 'ICU_BED', required_quantity: 1 }]
    }, token);
    const reqId3 = req3Res.data.data.id;

    const zeroAvailAttempt = await makeRequest('POST', '/reservations', {
      emergency_request_id: reqId3,
      hospital_id: testHospitalId,
      resource_id: singleIcuResourceId,
      quantity: 1
    }, token);

    assert(zeroAvailAttempt.status === 409, 'Subsequent reservation when available = 0 rejected with 409 Conflict');

    // 8. Verify Reservation Above Available Quantity is Rejected
    // Try to reserve 5 on a resource where capacity is 1
    const overReserveAttempt = await makeRequest('POST', '/reservations', {
      emergency_request_id: reqId3,
      hospital_id: testHospitalId,
      resource_id: singleIcuResourceId,
      quantity: 5
    }, token);
    assert(overReserveAttempt.status === 409, 'Reservation above available quantity rejected with 409 Conflict');

    // 9. Verify Negative Quantity Validation
    const negQtyAttempt = await makeRequest('POST', '/reservations', {
      emergency_request_id: reqId3,
      hospital_id: testHospitalId,
      resource_id: singleIcuResourceId,
      quantity: -1
    }, token);
    assert(negQtyAttempt.status === 400, 'Negative reservation quantity rejected with 400 Bad Request');

    // 10. Verify Reservation History Ledger
    const historyRes = await makeRequest('GET', `/reservations/emergency-request/${winningRequestId}/history`, null, token);
    assert(historyRes.status === 200, 'GET /api/reservations/emergency-request/:id/history returns 200 OK');
    assert(Array.isArray(historyRes.data?.data), 'Returns array of reservation history records');
    assert(historyRes.data.data.length >= 1, 'Reservation history contains at least 1 recorded action');
    assert(historyRes.data.data[0].action === 'RESERVED', 'History action records RESERVED');
    assert(historyRes.data.data[0].quantity === 1, 'History quantity records 1 unit');

    // 11. Test Cancellation & Release of Reservation
    console.log('\n--- Testing Cancellation & Release of Held Reservation ---');
    const releaseRes = await makeRequest('POST', `/reservations/${winningReservationId}/release`, {
      reason: 'Patient transferred to regional burn center; hold cancelled',
      status: 'CANCELLED'
    }, token);

    assert(releaseRes.status === 200, 'POST /api/reservations/:id/release returns 200 OK');
    assert(releaseRes.data?.data?.reservation?.status === 'CANCELLED', 'Reservation status updated to CANCELLED');
    assert(releaseRes.data?.data?.reservation?.released_at !== null, 'released_at timestamp recorded');

    // 12. Verify Available Quantity Restored
    const postReleaseCheck = await query('SELECT available_quantity, reserved_quantity FROM resources WHERE id = $1;', [singleIcuResourceId]);
    assert(postReleaseCheck.rows[0].available_quantity === 1, 'Available quantity restored to 1 upon release');
    assert(postReleaseCheck.rows[0].reserved_quantity === 0, 'Reserved quantity decreased back to 0');

    // Verify history recorded the release/cancellation
    const postReleaseHist = await makeRequest('GET', `/reservations/emergency-request/${winningRequestId}/history`, null, token);
    assert(
      postReleaseHist.data.data.some(h => h.action === 'CANCELLED' || h.action === 'RELEASED'),
      'Reservation history ledger recorded CANCELLED / RELEASED action'
    );

    // 13. Verify that Loser Request (req2) Can Now Reserve the Released Bed!
    console.log('\n--- Verifying Released Bed Can Be Reserved by Previously Blocked Request ---');
    const retryRes = await makeRequest('POST', '/reservations', {
      emergency_request_id: losingRequestId,
      hospital_id: testHospitalId,
      resource_id: singleIcuResourceId,
      quantity: 1,
      notes: 'Second attempt after first reservation was released'
    }, token);

    assert(retryRes.status === 201, 'Previously blocked request successfully reserves newly released bed (201 Created)');
    const finalCheck = await query('SELECT available_quantity, reserved_quantity FROM resources WHERE id = $1;', [singleIcuResourceId]);
    assert(finalCheck.rows[0].available_quantity === 0, 'Available quantity safely returns to 0');
    assert(finalCheck.rows[0].reserved_quantity === 1, 'Reserved quantity is 1');

    // 14. Test Release All Reservations Endpoint
    const releaseAllRes = await makeRequest('POST', `/emergency-requests/${losingRequestId}/release-reservations`, {
      reason: 'Incident concluded'
    }, token);
    assert(releaseAllRes.status === 200, 'POST /api/emergency-requests/:id/release-reservations returns 200 OK');
    assert(releaseAllRes.data?.data?.released_count >= 1, 'Successfully released all reservations');

    const cleanCheck = await query('SELECT available_quantity, reserved_quantity FROM resources WHERE id = $1;', [singleIcuResourceId]);
    assert(cleanCheck.rows[0].available_quantity === 1, 'Bed safely returned to inventory (available = 1, reserved = 0)');

    console.log('\n==============================================================');
    console.log(`  PHASE 9 TEST RESULTS: ${passedTests} TESTS PASSED`);
    console.log('==============================================================\n');
    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    logFail('Test run failed with unhandled error', err);
    console.log(`\nTests passed: ${passedTests}, Tests failed: ${failedTests}`);
    setTimeout(() => process.exit(1), 100);
  }
}

runTests();
