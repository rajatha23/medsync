const logger = require('../utils/logger');
const { query } = require('../db');

const API_BASE = 'http://localhost:5000/api';

async function runResourceTests() {
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
  logger.info('  RUNNING PHASE 5: HOSPITAL RESOURCE MANAGEMENT TEST SUITE     ');
  logger.info('==============================================================');

  try {
    // 1. Authenticate Coordinator
    const coordLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'coordinator@medsync.demo', password: 'Password123!' })
    });
    const coordToken = (await coordLogin.json()).data.token;
    assert(coordToken !== undefined, 'Coordinator authenticated successfully');

    // 2. Authenticate Metro Hospital Admin
    const metroAdminLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.metro@medsync.demo', password: 'Password123!' })
    });
    const metroAdminToken = (await metroAdminLogin.json()).data.token;
    assert(metroAdminToken !== undefined, 'Metro Hospital Admin authenticated successfully');

    // 3. Authenticate St. Jude Hospital Admin
    const stJudeAdminLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.stjude@medsync.demo', password: 'Password123!' })
    });
    const stJudeAdminToken = (await stJudeAdminLogin.json()).data.token;
    assert(stJudeAdminToken !== undefined, 'St. Jude Hospital Admin authenticated successfully');

    // TEST 1: Unauthenticated request rejected
    const unauthRes = await fetch(`${API_BASE}/resources`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/resources returns 401');

    // TEST 2: Coordinator can view all resources across the network
    const allRes = await fetch(`${API_BASE}/resources`, {
      headers: { 'Authorization': `Bearer ${coordToken}` }
    });
    const allData = await allRes.json();
    assert(allRes.status === 200, 'Coordinator GET /api/resources returns 200');
    assert(allData.data.length >= 20, `Coordinator retrieves full network resources (${allData.data.length} records)`);
    assert(allData.data[0].resource_label !== undefined, 'Resources contain human-friendly labels');
    assert(allData.data[0].total_quantity !== undefined, 'Resources contain normalized total_quantity');
    assert(allData.data[0].available_quantity !== undefined, 'Resources contain available_quantity');
    assert(allData.data[0].threshold !== undefined, 'Resources contain threshold');
    assert(allData.data[0].last_updated !== undefined, 'Resources contain last_updated timestamp');

    // TEST 3: Resource Summary KPIs
    const summaryRes = await fetch(`${API_BASE}/resources/summary`, {
      headers: { 'Authorization': `Bearer ${coordToken}` }
    });
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200, 'Coordinator GET /api/resources/summary returns 200');
    assert(summaryData.data.totalResources > 0, `Summary reports ${summaryData.data.totalResources} total resources`);
    assert(summaryData.data.icuBeds.total > 0, `Summary reports ICU beds (Available: ${summaryData.data.icuBeds.available}/${summaryData.data.icuBeds.total})`);
    assert(summaryData.data.bloodUnits.available > 0, `Summary reports blood units (${summaryData.data.bloodUnits.available} units)`);
    assert(summaryData.data.ventilators.total > 0, `Summary reports ventilators (${summaryData.data.ventilators.available}/${summaryData.data.ventilators.total})`);
    assert(summaryData.data.statusBreakdown !== undefined, 'Summary includes status breakdown');

    // TEST 4: Category Filtering (BEDS, BLOOD, EQUIPMENT, CAPACITY)
    const bedsRes = await fetch(`${API_BASE}/resources?category=BEDS`, {
      headers: { 'Authorization': `Bearer ${coordToken}` }
    });
    const bedsData = await bedsRes.json();
    assert(bedsRes.status === 200, 'GET /api/resources?category=BEDS returns 200');
    assert(bedsData.data.every(r => r.category === 'BEDS'), 'All returned resources belong to category BEDS');

    const bloodRes = await fetch(`${API_BASE}/resources?category=BLOOD`, {
      headers: { 'Authorization': `Bearer ${coordToken}` }
    });
    const bloodData = await bloodRes.json();
    assert(bloodRes.status === 200, 'GET /api/resources?category=BLOOD returns 200');
    assert(bloodData.data.every(r => r.category === 'BLOOD'), 'All returned resources belong to category BLOOD');

    // TEST 5: Status Filtering
    const statusRes = await fetch(`${API_BASE}/resources?status=AVAILABLE`, {
      headers: { 'Authorization': `Bearer ${coordToken}` }
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, 'GET /api/resources?status=AVAILABLE returns 200');
    assert(statusData.data.every(r => r.status === 'AVAILABLE'), 'All returned resources have status AVAILABLE');

    // TEST 6: Hospital Admin Isolation - Metro Admin views only Metro Hospital's resources
    const metroListRes = await fetch(`${API_BASE}/resources`, {
      headers: { 'Authorization': `Bearer ${metroAdminToken}` }
    });
    const metroListData = await metroListRes.json();
    assert(metroListRes.status === 200, 'Metro Admin GET /api/resources returns 200');
    assert(metroListData.data.every(r => r.hospital_id === 'hosp-metro-01'), 'Metro Admin only receives resources for hosp-metro-01');

    // TEST 7: Coordinator CANNOT modify or update hospital resources (Role Enforcement)
    const coordUpdateRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${coordToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ total_quantity: 30, available_quantity: 20 })
    });
    assert(coordUpdateRes.status === 403, 'Coordinator cannot update hospital resources (returns 403 Forbidden)');

    // TEST 8: Metro Admin can update their own hospital resource (res-m1-icu)
    const validUpdateRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: 22,
        threshold: 5
      })
    });
    const validUpdateData = await validUpdateRes.json();
    assert(validUpdateRes.status === 200, 'Metro Admin PUT /api/resources/res-m1-icu returns 200');
    assert(validUpdateData.data.available_quantity === 22, 'Available quantity successfully updated to 22');
    assert(validUpdateData.data.status === 'AVAILABLE', 'Status auto-calculated as AVAILABLE (22 > 5 * 1.5)');

    // TEST 9: Status Auto-Calculation - LIMITED
    const limitedUpdateRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: 7,
        threshold: 5
      })
    });
    const limitedData = await limitedUpdateRes.json();
    assert(limitedData.data.status === 'LIMITED', 'Status auto-calculated as LIMITED (7 <= 5 * 1.5)');

    // TEST 10: Status Auto-Calculation - CRITICAL
    const critUpdateRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: 4,
        threshold: 5
      })
    });
    const critData = await critUpdateRes.json();
    assert(critData.data.status === 'CRITICAL', 'Status auto-calculated as CRITICAL (4 <= 5)');

    // TEST 11: Status Auto-Calculation - UNAVAILABLE
    const unavailUpdateRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: 0,
        threshold: 5
      })
    });
    const unavailData = await unavailUpdateRes.json();
    assert(unavailData.data.status === 'UNAVAILABLE', 'Status auto-calculated as UNAVAILABLE (0 available)');

    // TEST 12: Restore normal state
    const restoreRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: 14,
        threshold: 5
      })
    });
    assert(restoreRes.status === 200, 'Restored res-m1-icu to normal baseline');

    // TEST 13: Invalid Quantity - Negative Available Quantity Rejected
    const negAvailRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: -5
      })
    });
    assert(negAvailRes.status === 400, 'Negative available_quantity rejected with 400 Bad Request');

    // TEST 14: Invalid Quantity - Negative Total Quantity Rejected
    const negTotalRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: -10,
        available_quantity: 5
      })
    });
    assert(negTotalRes.status === 400, 'Negative total_quantity rejected with 400 Bad Request');

    // TEST 15: Invalid Quantity - Available Exceeds Total Rejected
    const exceedRes = await fetch(`${API_BASE}/resources/res-m1-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 30,
        available_quantity: 35
      })
    });
    assert(exceedRes.status === 400, 'available_quantity exceeding total_quantity rejected with 400 Bad Request');

    // TEST 16: Strict Authorization - Metro Admin CANNOT touch St. Jude Resource (res-s2-icu)
    const crossUpdateRes = await fetch(`${API_BASE}/resources/res-s2-icu`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_quantity: 20,
        available_quantity: 15
      })
    });
    assert(crossUpdateRes.status === 403, 'Metro Admin cannot update St. Jude resource (returns 403 Forbidden)');

    // TEST 17: Metro Admin CANNOT inspect details of St. Jude Resource
    const crossGetRes = await fetch(`${API_BASE}/resources/res-s2-icu`, {
      headers: { 'Authorization': `Bearer ${metroAdminToken}` }
    });
    assert(crossGetRes.status === 403, 'Metro Admin cannot view resource details of another hospital (returns 403 Forbidden)');

    // TEST 18: St. Jude Admin CAN inspect their own resource
    const stJudeGetRes = await fetch(`${API_BASE}/resources/res-s2-icu`, {
      headers: { 'Authorization': `Bearer ${stJudeAdminToken}` }
    });
    assert(stJudeGetRes.status === 200, 'St. Jude Admin can view their own resource (returns 200 OK)');

    // TEST 19: Hospital Admin can create a new resource for their hospital
    const createRes = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metroAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: 'BEDS',
        resource_type: 'EMERGENCY_BED',
        total_quantity: 15,
        available_quantity: 12,
        threshold: 3,
        unit_of_measure: 'beds'
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Hospital Admin POST /api/resources creates resource (201 Created)');
    const createdId = createData.data?.id;
    assert(createdId !== undefined, `Created resource ID: ${createdId}`);
    assert(createData.data.status === 'AVAILABLE', 'Created resource auto-calculated status as AVAILABLE');

    // TEST 20: Verify audit trail in resource_updates table
    const auditRes = await query('SELECT * FROM resource_updates WHERE resource_id = $1', [createdId]);
    assert(auditRes.rows.length >= 1, 'Resource creation recorded in resource_updates audit trail');

    // TEST 21: Hospital Admin can delete their created resource
    const deleteRes = await fetch(`${API_BASE}/resources/${createdId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${metroAdminToken}` }
    });
    assert(deleteRes.status === 200, 'Hospital Admin DELETE /api/resources/:id returns 200 OK');

    // Verify deletion
    const verifyDel = await fetch(`${API_BASE}/resources/${createdId}`, {
      headers: { 'Authorization': `Bearer ${metroAdminToken}` }
    });
    assert(verifyDel.status === 404, 'Deleted resource no longer found (returns 404)');

    logger.info('==============================================================');
    logger.info(`  PHASE 5 TEST RESULTS: ${passed}/${total} TESTS PASSED        `);
    logger.info('==============================================================');

    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    logger.error(`Resource test suite encountered fatal error: ${err.message}`);
    setTimeout(() => process.exit(1), 100);
  }
}

runResourceTests();
