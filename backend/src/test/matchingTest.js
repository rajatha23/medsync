/**
 * Phase 8: Smart Resource Matching Test Suite
 * Tests algorithmic matching, classification (FULL, PARTIAL, NO MATCH),
 * distance, utilization, transparent explainable scoring, and edge cases.
 */
const http = require('http');
const { query } = require('../db');
const matchingService = require('../services/matchingService');

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
  console.log('  RUNNING PHASE 8: SMART RESOURCE MATCHING TEST SUITE        ');
  console.log('==============================================================');

  try {
    // 0. Ensure at least one hospital is marked OFFLINE for test purposes if none exists
    // Let's check hospitals
    const hospCheck = await query(`SELECT id, status FROM hospitals WHERE status = 'OFFLINE' LIMIT 1;`);
    let offlineHospitalId;
    if (hospCheck.rows.length === 0) {
      // Temporarily mark one test hospital or create one
      await query(`
        INSERT INTO hospitals (id, name, code, tier, trauma_level, status, address, city, latitude, longitude, contact_phone, contact_email)
        VALUES ('hosp-offline-test', 'Civic Quarantined Field Station', 'CIVIC-OFF', 'Regional', 'Community', 'OFFLINE', '999 Outskirts Rd', 'Metropolis', 40.8500, -73.9000, '+1 (555) 999-0000', 'civic@medsync.demo')
        ON CONFLICT (id) DO UPDATE SET status = 'OFFLINE';
      `);
      offlineHospitalId = 'hosp-offline-test';
    } else {
      offlineHospitalId = hospCheck.rows[0].id;
    }

    // 1. Authenticate Coordinator
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'coordinator@medsync.demo',
      password: 'Password123!'
    });
    assert(loginRes.status === 200 && loginRes.data?.data?.token, 'Coordinator authenticated successfully');
    const token = loginRes.data.data.token;

    // 2. Create Test Emergency Request with specific resource demands
    // Location near Metro Trauma (40.7128, -74.0060)
    // Demand: 1 ICU Bed, 1 Ventilator, 2 Blood O-
    const createRes = await makeRequest('POST', '/emergency-requests', {
      location: '150 Greenwich St, Financial District, Metropolis',
      latitude: 40.7115,
      longitude: -74.0125,
      priority: 'CRITICAL',
      incident_category: 'TRAUMA',
      patient_reference: `MATCH-TEST-${Date.now().toString().slice(-4)}`,
      notes: 'Testing smart matching engine evaluation',
      required_resources: [
        { resource_type: 'ICU_BED', required_quantity: 1 },
        { resource_type: 'VENTILATOR', required_quantity: 1 },
        { resource_type: 'BLOOD_O_NEG', required_quantity: 2 }
      ]
    }, token);

    assert(createRes.status === 201 && createRes.data?.data?.id, 'Test emergency request created for matching');
    const testRequestId = createRes.data.data.id;

    // 3. Test GET /api/emergency-requests/:id/matching-hospitals
    const matchRes = await makeRequest('GET', `/emergency-requests/${testRequestId}/matching-hospitals`, null, token);
    assert(matchRes.status === 200, 'GET /api/emergency-requests/:id/matching-hospitals returns 200 OK');
    assert(matchRes.data?.success === true, 'Response has success: true');
    assert(Array.isArray(matchRes.data?.data?.hospitals), 'Returns array of candidate hospitals');
    
    const hospitals = matchRes.data.data.hospitals;
    assert(hospitals.length >= 3, `Evaluated at least 3 hospitals across network (found ${hospitals.length})`);

    // 4. Test Summary Stats
    const summary = matchRes.data.data.summary;
    assert(typeof summary.full_matches === 'number', 'Summary contains full_matches count');
    assert(typeof summary.partial_matches === 'number', 'Summary contains partial_matches count');
    assert(typeof summary.no_matches === 'number', 'Summary contains no_matches count');
    assert(
      summary.full_matches + summary.partial_matches + summary.no_matches === summary.total_facilities_evaluated,
      'Classification counts sum exactly to total evaluated facilities'
    );

    // 5. Test FULL MATCH verification
    const fullMatches = hospitals.filter(h => h.classification === 'FULL MATCH');
    assert(fullMatches.length > 0, `Found at least one FULL MATCH facility (found ${fullMatches.length})`);
    
    const topFullMatch = fullMatches[0];
    assert(topFullMatch.operational_status !== 'OFFLINE', 'FULL MATCH hospital is not OFFLINE');
    assert(topFullMatch.operational_status !== 'DIVERT', 'FULL MATCH hospital is not on DIVERT');
    assert(topFullMatch.missing_resources.length === 0, 'FULL MATCH hospital has 0 missing resources');
    assert(topFullMatch.fulfillment.percentage === 100, 'FULL MATCH hospital has 100% fulfillment percentage');
    assert(topFullMatch.coordination_score > 0, `FULL MATCH has positive coordination score (${topFullMatch.coordination_score})`);

    // Verify resources required vs available
    assert(Array.isArray(topFullMatch.resources_required), 'Hospital output includes resources_required array');
    assert(Array.isArray(topFullMatch.resources_available), 'Hospital output includes resources_available array');
    assert(Array.isArray(topFullMatch.missing_resources), 'Hospital output includes missing_resources array');

    // 6. Test Distance and Proximity Calculation
    assert(typeof topFullMatch.distance_km === 'number', 'Distance is computed as a numerical value');
    assert(topFullMatch.distance_km >= 0, `Valid non-negative distance (${topFullMatch.distance_km} km)`);
    assert(topFullMatch.score_breakdown.proximity_score <= 30, 'Proximity score does not exceed 30 pts max');

    // 7. Test Current Utilization Calculation
    assert(typeof topFullMatch.current_utilization_pct === 'number', 'Current utilization is computed as percentage');
    assert(
      topFullMatch.current_utilization_pct >= 0 && topFullMatch.current_utilization_pct <= 100,
      `Utilization percentage is within 0-100% range (${topFullMatch.current_utilization_pct}%)`
    );
    assert(topFullMatch.score_breakdown.headroom_score <= 20, 'Headroom score does not exceed 20 pts max');

    // 8. Test Transparent Explainable Score and Breakdown
    const scoreBreakdown = topFullMatch.score_breakdown;
    assert(scoreBreakdown !== undefined, 'Hospital contains score_breakdown object');
    assert(typeof scoreBreakdown.total_score === 'number', 'score_breakdown contains total_score');
    assert(typeof scoreBreakdown.resource_score === 'number', 'score_breakdown contains resource_score');
    assert(typeof scoreBreakdown.proximity_score === 'number', 'score_breakdown contains proximity_score');
    assert(typeof scoreBreakdown.headroom_score === 'number', 'score_breakdown contains headroom_score');
    assert(typeof scoreBreakdown.operational_penalty === 'number', 'score_breakdown contains operational_penalty');
    assert(typeof scoreBreakdown.explanation === 'string', 'score_breakdown contains human-readable explanation');
    assert(
      scoreBreakdown.disclaimer.includes('medical advice'),
      'Score breakdown contains mandatory disclaimer stating it does not constitute medical advice'
    );

    // 9. Test PARTIAL MATCH verification
    // St. Jude or Northshore (or any facility lacking all quantities)
    const partialMatches = hospitals.filter(h => h.classification === 'PARTIAL MATCH');
    assert(partialMatches.length > 0, `Identified PARTIAL MATCH facilities (found ${partialMatches.length})`);
    const aPartialMatch = partialMatches[0];
    assert(
      aPartialMatch.missing_resources.length > 0 || aPartialMatch.operational_status === 'DIVERT',
      'PARTIAL MATCH hospital either has missing resources or is on DIVERT status'
    );
    assert(aPartialMatch.operational_status !== 'OFFLINE', 'PARTIAL MATCH facility is not OFFLINE');

    // 10. Test NO MATCH & OFFLINE Hospital verification
    const offlineHospitalResult = hospitals.find(h => h.hospital.id === offlineHospitalId);
    assert(offlineHospitalResult !== undefined, 'Evaluation evaluated OFFLINE facility');
    assert(offlineHospitalResult.classification === 'NO MATCH', 'OFFLINE hospital classified as NO MATCH');
    assert(offlineHospitalResult.coordination_score === 0, 'OFFLINE hospital receives coordination score of 0');
    assert(
      offlineHospitalResult.score_breakdown.explanation.includes('OFFLINE'),
      'OFFLINE hospital score explanation notes facility is offline'
    );

    // 11. Test Insufficient Resources (Extreme Demand scenario)
    // Request 500 ICU beds, 500 Ventilators, 1000 Blood units (no hospital can fully satisfy)
    const extremeRes = await makeRequest('POST', '/matching/preview', {
      incidentLatitude: 40.7128,
      incidentLongitude: -74.0060,
      required_resources: [
        { resource_type: 'ICU_BED', required_quantity: 500 },
        { resource_type: 'VENTILATOR', required_quantity: 500 }
      ]
    }, token);

    assert(extremeRes.status === 200, 'POST /api/matching/preview returns 200 OK');
    const extremeHospitals = extremeRes.data.data.hospitals;
    const extremeFullMatches = extremeHospitals.filter(h => h.classification === 'FULL MATCH');
    assert(extremeFullMatches.length === 0, 'Extreme resource demand produces 0 FULL MATCH results');
    
    // Every operational hospital with beds should be PARTIAL MATCH with missing_resources
    const extremePartials = extremeHospitals.filter(h => h.classification === 'PARTIAL MATCH');
    assert(extremePartials.length > 0, 'Hospitals with partial capacity classified as PARTIAL MATCH');
    
    const sampleExtremePartial = extremePartials[0];
    assert(sampleExtremePartial.missing_resources.length > 0, 'Insufficient resources properly flagged in missing_resources list');
    const icuMissing = sampleExtremePartial.missing_resources.find(m => m.resource_type === 'ICU_BED');
    assert(icuMissing !== undefined, 'Missing ICU bed deficit correctly calculated');
    assert(icuMissing.missing_quantity > 0, `Missing quantity is positive (deficit: ${icuMissing.missing_quantity})`);
    assert(
      icuMissing.required_quantity - icuMissing.available_quantity === icuMissing.missing_quantity,
      'Deficit matches exact formula: required_quantity - available_quantity'
    );

    // 12. Test Zero-Supply / No Match scenario
    // Request a fictitious or non-existent resource type
    const noMatchRes = await makeRequest('POST', '/matching/preview', {
      incidentLatitude: 40.7128,
      incidentLongitude: -74.0060,
      required_resources: [
        { resource_type: 'NON_EXISTENT_ROBOTIC_POD', required_quantity: 10 }
      ]
    }, token);

    assert(noMatchRes.status === 200, 'POST /api/matching/preview with unknown resource returns 200 OK');
    const noMatchHospitals = noMatchRes.data.data.hospitals;
    const allNoMatch = noMatchHospitals.every(h => h.classification === 'NO MATCH');
    assert(allNoMatch, 'When 0 resources are available anywhere, all hospitals classified as NO MATCH');

    // 13. Test Sorting Verification
    // Full matches must appear before Partial matches, and within class by coordination score desc
    for (let i = 0; i < hospitals.length - 1; i++) {
      const curr = hospitals[i];
      const next = hospitals[i + 1];
      const classRank = { 'FULL MATCH': 1, 'PARTIAL MATCH': 2, 'NO MATCH': 3 };
      assert(
        classRank[curr.classification] <= classRank[next.classification],
        `Hospital order verifies classification hierarchy: ${curr.classification} comes before/at ${next.classification}`
      );
      if (curr.classification === next.classification) {
        assert(
          curr.coordination_score >= next.coordination_score,
          `Within ${curr.classification}, scores descend (${curr.coordination_score} >= ${next.coordination_score})`
        );
      }
    }

    // 14. Test Invalid Request ID
    const notFoundRes = await makeRequest('GET', '/emergency-requests/req-non-existent-999/matching-hospitals', null, token);
    assert(notFoundRes.status === 404, 'Non-existent emergency request ID returns 404 Not Found');

    console.log('\n==============================================================');
    console.log(`  PHASE 8 TEST RESULTS: ${passedTests} TESTS PASSED`);
    console.log('==============================================================\n');
    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    logFail('Test run failed with unhandled error', err);
    console.log(`\nTests passed: ${passedTests}, Tests failed: ${failedTests}`);
    setTimeout(() => process.exit(1), 100);
  }
}

runTests();
