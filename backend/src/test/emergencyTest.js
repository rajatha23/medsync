const logger = require('../utils/logger');
const { query } = require('../db');

const API_BASE = 'http://localhost:5000/api';

async function runEmergencyTests() {
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
  logger.info('  RUNNING PHASE 7: EMERGENCY REQUEST WORKFLOW TEST SUITE      ');
  logger.info('==============================================================');

  try {
    // 1. Unauthenticated request rejected
    const unauthRes = await fetch(`${API_BASE}/emergency-requests`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/emergency-requests rejected with 401');

    // 2. Authenticate Coordinator
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'coordinator@medsync.demo', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    assert(token !== undefined, 'Coordinator authenticated successfully');

    // TEST 1: Create Emergency Request with Required Resources
    const createPayload = {
      location: '450 West 33rd St, Manhattan, NY',
      latitude: 40.7535,
      longitude: -74.0001,
      priority: 'CRITICAL',
      incident_category: 'CARDIAC',
      patient_reference: 'TEST-PT-8812',
      notes: 'Severe acute coronary syndrome. Immediate ICU intake required.',
      required_resources: [
        { resource_type: 'ICU_BED', required_quantity: 1 },
        { resource_type: 'BLOOD_O_NEG', required_quantity: 2 },
        { resource_type: 'VENTILATOR', required_quantity: 1 }
      ]
    };

    const createRes = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    const createBody = await createRes.json();
    assert(createRes.status === 201, 'POST /api/emergency-requests returns 201 Created');
    const emergency = createBody.data;
    assert(emergency.id !== undefined, 'Emergency request has unique ID');
    assert(emergency.tracking_code && emergency.tracking_code.startsWith('MED-REQ-'), `Emergency has valid tracking_code (${emergency.tracking_code})`);
    assert(emergency.status === 'SEARCHING', 'Initial status set to SEARCHING');
    assert(emergency.priority === 'CRITICAL', 'Priority set to CRITICAL');
    assert(emergency.location === createPayload.location, 'Location set properly');
    assert(emergency.latitude === createPayload.latitude, 'Latitude recorded properly');
    assert(emergency.longitude === createPayload.longitude, 'Longitude recorded properly');
    assert(emergency.created_by !== undefined, 'created_by recorded from authenticated coordinator');
    assert(emergency.created_at !== undefined, 'created_at timestamp populated');
    assert(emergency.required_resources.length === 3, 'Attached 3 required resources');

    const emgId = emergency.id;

    // TEST 2: Verify request_resources inserted in database
    const rrDb = await query('SELECT * FROM request_resources WHERE emergency_request_id = $1', [emgId]);
    assert(rrDb.rows.length === 3, 'request_resources table verified in PostgreSQL with 3 rows');
    assert(rrDb.rows.some(r => r.resource_type === 'BLOOD_O_NEG' && r.required_quantity === 2), 'BLOOD_O_NEG required_quantity = 2');

    // TEST 3: Verify initial status logged in emergency_status_history
    const historyDb = await query('SELECT * FROM emergency_status_history WHERE emergency_request_id = $1', [emgId]);
    assert(historyDb.rows.length >= 1, 'Initial timeline event logged in emergency_status_history');
    assert(historyDb.rows[0].new_status === 'SEARCHING', 'History record records status SEARCHING');

    // TEST 4: Invalid Requests - Missing Location
    const badLocRes = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 40.7,
        longitude: -74.0,
        priority: 'HIGH'
      })
    });
    assert(badLocRes.status === 400, 'Missing location rejected with 400 Bad Request');

    // TEST 5: Invalid Requests - Invalid Coordinates
    const badCoordsRes = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: 'Times Square',
        latitude: 'invalid-lat',
        longitude: -74.0,
        priority: 'HIGH'
      })
    });
    assert(badCoordsRes.status === 400, 'Invalid latitude rejected with 400 Bad Request');

    // TEST 6: Invalid Requests - Invalid Priority
    const badPriorityRes = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: 'Central Park',
        latitude: 40.78,
        longitude: -73.96,
        priority: 'SUPER_URGENT'
      })
    });
    assert(badPriorityRes.status === 400, 'Invalid priority rejected with 400 Bad Request');

    // TEST 7: Invalid Requests - Invalid Resource Quantity (negative or zero)
    const badQtyRes = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: 'Brooklyn Navy Yard',
        latitude: 40.70,
        longitude: -73.97,
        priority: 'HIGH',
        required_resources: [{ resource_type: 'ICU_BED', required_quantity: -2 }]
      })
    });
    assert(badQtyRes.status === 400, 'Negative required_quantity rejected with 400 Bad Request');

    // TEST 8: Full Status Lifecycle Transitions:
    // Status 1: SEARCHING -> MATCH_FOUND
    const t1Res = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'MATCH_FOUND',
        assigned_hospital_id: 'hosp-metro-01',
        notes: 'Candidate facility found: Metro Trauma Hospital'
      })
    });
    assert(t1Res.status === 200, 'Transition SEARCHING -> MATCH_FOUND returns 200 OK');
    const t1Data = (await t1Res.json()).data;
    assert(t1Data.status === 'MATCH_FOUND', 'Status updated to MATCH_FOUND');

    // Status 2: MATCH_FOUND -> PENDING_ACCEPTANCE
    const t2Res = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'PENDING_ACCEPTANCE',
        notes: 'Dispatched triage alert to Metro Trauma ER coordinator'
      })
    });
    assert(t2Res.status === 200, 'Transition MATCH_FOUND -> PENDING_ACCEPTANCE returns 200 OK');
    const t2Data = (await t2Res.json()).data;
    assert(t2Data.status === 'PENDING_ACCEPTANCE', 'Status updated to PENDING_ACCEPTANCE');

    // Status 3: PENDING_ACCEPTANCE -> ACCEPTED
    const t3Res = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ACCEPTED',
        notes: 'Hospital triage team accepted patient intake'
      })
    });
    assert(t3Res.status === 200, 'Transition PENDING_ACCEPTANCE -> ACCEPTED returns 200 OK');
    const t3Data = (await t3Res.json()).data;
    assert(t3Data.status === 'ACCEPTED', 'Status updated to ACCEPTED');

    // Status 4: ACCEPTED -> RESERVED
    const t4Res = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'RESERVED',
        notes: 'Holding bay and ICU bed soft-reserved for ambulance arrival'
      })
    });
    assert(t4Res.status === 200, 'Transition ACCEPTED -> RESERVED returns 200 OK');
    const t4Data = (await t4Res.json()).data;
    assert(t4Data.status === 'RESERVED', 'Status updated to RESERVED');

    // Status 5: RESERVED -> ALLOCATED
    const t5Res = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ALLOCATED',
        notes: 'Ambulance en route. Bed 4B allocated to incoming patient.'
      })
    });
    assert(t5Res.status === 200, 'Transition RESERVED -> ALLOCATED returns 200 OK');
    const t5Data = (await t5Res.json()).data;
    assert(t5Data.status === 'ALLOCATED', 'Status updated to ALLOCATED');

    // Status 6: ALLOCATED -> COMPLETED
    const t6Res = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'COMPLETED',
        notes: 'Patient admitted successfully into Metro Trauma ICU.'
      })
    });
    assert(t6Res.status === 200, 'Transition ALLOCATED -> COMPLETED returns 200 OK');
    const t6Data = (await t6Res.json()).data;
    assert(t6Data.status === 'COMPLETED', 'Status updated to COMPLETED');
    assert(t6Data.resolved_at !== null, 'resolved_at timestamp populated upon completion');

    // TEST 9: Terminal State Enforcement - Cannot transition from COMPLETED
    const tTerminalRes = await fetch(`${API_BASE}/emergency-requests/${emgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SEARCHING' })
    });
    assert(tTerminalRes.status === 400, 'Transition from terminal status COMPLETED rejected with 400 Bad Request');

    // TEST 10: Verify Complete Timeline History via GET /api/emergency-requests/:id
    const detailRes = await fetch(`${API_BASE}/emergency-requests/${emgId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(detailRes.status === 200, 'GET /api/emergency-requests/:id returns 200 OK');
    const detail = (await detailRes.json()).data;
    assert(Array.isArray(detail.timeline), 'Details payload contains timeline array');
    assert(detail.timeline.length === 7, `Timeline recorded all 7 lifecycle events (found ${detail.timeline.length})`);
    assert(detail.timeline[0].new_status === 'SEARCHING', 'Timeline step 1: SEARCHING');
    assert(detail.timeline[1].new_status === 'MATCH_FOUND', 'Timeline step 2: MATCH_FOUND');
    assert(detail.timeline[2].new_status === 'PENDING_ACCEPTANCE', 'Timeline step 3: PENDING_ACCEPTANCE');
    assert(detail.timeline[3].new_status === 'ACCEPTED', 'Timeline step 4: ACCEPTED');
    assert(detail.timeline[4].new_status === 'RESERVED', 'Timeline step 5: RESERVED');
    assert(detail.timeline[5].new_status === 'ALLOCATED', 'Timeline step 6: ALLOCATED');
    assert(detail.timeline[6].new_status === 'COMPLETED', 'Timeline step 7: COMPLETED');

    // TEST 11: Cancellation Workflow
    const cancelCreate = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: '125th St, Harlem, NY',
        latitude: 40.8080,
        longitude: -73.9450,
        priority: 'LOW',
        notes: 'Caller reported false alarm.'
      })
    });
    const cancelEmgId = (await cancelCreate.json()).data.id;

    const cancelRes = await fetch(`${API_BASE}/emergency-requests/${cancelEmgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED', notes: 'Incident cancelled by caller' })
    });
    assert(cancelRes.status === 200, 'Transition SEARCHING -> CANCELLED returns 200 OK');
    const cancelData = (await cancelRes.json()).data;
    assert(cancelData.status === 'CANCELLED', 'Status updated to CANCELLED');
    assert(cancelData.resolved_at !== null, 'resolved_at timestamp populated upon cancellation');

    // Cannot transition from CANCELLED
    const postCancelRes = await fetch(`${API_BASE}/emergency-requests/${cancelEmgId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'MATCH_FOUND' })
    });
    assert(postCancelRes.status === 400, 'Transition from terminal status CANCELLED rejected with 400 Bad Request');

    // TEST 12: Invalid Status Transition - Jumping from SEARCHING to ALLOCATED
    const jumpCreate = await fetch(`${API_BASE}/emergency-requests`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Queens Blvd, NY',
        latitude: 40.7282,
        longitude: -73.7949,
        priority: 'MEDIUM'
      })
    });
    const jumpId = (await jumpCreate.json()).data.id;

    const jumpRes = await fetch(`${API_BASE}/emergency-requests/${jumpId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ALLOCATED' })
    });
    assert(jumpRes.status === 400, 'Illegal jump transition (SEARCHING -> ALLOCATED) rejected with 400 Bad Request');

    // TEST 13: GET /api/emergency-requests List & Filtering
    const listAllRes = await fetch(`${API_BASE}/emergency-requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(listAllRes.status === 200, 'GET /api/emergency-requests returns 200 OK');
    const allList = (await listAllRes.json()).data;
    assert(allList.length >= 3, `Returned emergency requests (${allList.length} items)`);

    const filterStatusRes = await fetch(`${API_BASE}/emergency-requests?status=COMPLETED`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const completedList = (await filterStatusRes.json()).data;
    assert(completedList.every(e => e.status === 'COMPLETED'), 'Filter by status=COMPLETED verified');

    const filterPriorityRes = await fetch(`${API_BASE}/emergency-requests?priority=CRITICAL`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const critList = (await filterPriorityRes.json()).data;
    assert(critList.every(e => e.priority === 'CRITICAL'), 'Filter by priority=CRITICAL verified');

    logger.info('==============================================================');
    logger.info(`  PHASE 7 TEST RESULTS: ${passed}/${total} TESTS PASSED        `);
    logger.info('==============================================================');

    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    logger.error(`Emergency workflow test suite failed: ${err.message}`);
    setTimeout(() => process.exit(1), 100);
  }
}

runEmergencyTests();
