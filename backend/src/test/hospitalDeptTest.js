const logger = require('../utils/logger');

const API_BASE = 'http://localhost:5000/api';

async function runHospitalDeptTests() {
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
  logger.info('  RUNNING HOSPITAL & DEPARTMENT CRUD & RBAC TEST SUITE       ');
  logger.info('==============================================================');

  // Obtain Tokens
  const coordLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coordinator@medsync.demo', password: 'Password123!' })
  });
  const coordToken = (await coordLogin.json()).data.token;

  const metroAdminLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.metro@medsync.demo', password: 'Password123!' })
  });
  const metroAdminToken = (await metroAdminLogin.json()).data.token;

  // TEST 1: Coordinator can view all hospitals
  const listRes = await fetch(`${API_BASE}/hospitals`, {
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  const listData = await listRes.json();
  assert(listRes.status === 200, 'Coordinator GET /api/hospitals returns 200 OK');
  assert(listData.data?.length >= 5, `Returns full hospital network (${listData.data?.length} hospitals)`);
  assert(listData.data[0]?.department_count !== undefined, 'Hospitals list includes aggregated department count');

  // TEST 2: Filtering hospitals by search query
  const searchRes = await fetch(`${API_BASE}/hospitals?search=Metropolitan`, {
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  const searchData = await searchRes.json();
  assert(searchRes.status === 200, 'GET /api/hospitals?search=Metropolitan returns 200 OK');
  assert(searchData.data.some(h => h.name.includes('Metropolitan')), 'Search filters matching hospital');

  // TEST 3: Get Hospital by ID
  const singleRes = await fetch(`${API_BASE}/hospitals/hosp-metro-01`, {
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  const singleData = await singleRes.json();
  assert(singleRes.status === 200, 'GET /api/hospitals/:id returns 200 OK');
  assert(singleData.data?.id === 'hosp-metro-01', 'Returns correct hospital object');
  assert(Array.isArray(singleData.data?.departments), 'Hospital includes array of departments');
  assert(Array.isArray(singleData.data?.resources), 'Hospital includes array of resources');

  // TEST 4: Coordinator can register new hospital
  const testCode = `TEST${Date.now().toString().slice(-4)}`;
  const createHospRes = await fetch(`${API_BASE}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${coordToken}`
    },
    body: JSON.stringify({
      name: 'Mercy Harbor Community Hospital',
      code: testCode,
      tier: 'Community Satellite',
      trauma_level: 'Level 3',
      address: '500 Ocean Ave, Harbor District',
      city: 'Metropolis',
      latitude: 40.6900,
      longitude: -74.0200,
      contact_phone: '+1 (555) 777-8899',
      contact_email: 'dispatch@mercyharbor.demo',
      status: 'NORMAL'
    })
  });
  const createHospData = await createHospRes.json();
  assert(createHospRes.status === 201, 'Coordinator POST /api/hospitals returns 201 Created');
  const createdHospId = createHospData.data.id;

  // TEST 5: Hospital Admin can modify OWN hospital
  const updateOwnRes = await fetch(`${API_BASE}/hospitals/hosp-metro-01`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${metroAdminToken}`
    },
    body: JSON.stringify({
      contact_phone: '+1 (555) 019-9999',
      status: 'NORMAL'
    })
  });
  assert(updateOwnRes.status === 200, 'Hospital Admin PUT /api/hospitals/:ownId returns 200 OK');

  // TEST 6: Hospital Admin CANNOT modify OTHER hospital
  const updateOtherRes = await fetch(`${API_BASE}/hospitals/hosp-stjude-02`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${metroAdminToken}`
    },
    body: JSON.stringify({
      contact_phone: '+1 (555) 000-0000'
    })
  });
  assert(updateOtherRes.status === 403, 'Hospital Admin updating other hospital blocked with 403 Forbidden');

  // TEST 7: Get departments by hospital
  const deptsRes = await fetch(`${API_BASE}/hospitals/hosp-metro-01/departments`, {
    headers: { 'Authorization': `Bearer ${metroAdminToken}` }
  });
  const deptsData = await deptsRes.json();
  assert(deptsRes.status === 200, 'GET /api/hospitals/:id/departments returns 200 OK');
  assert(deptsData.data?.length >= 3, 'Returns list of departments for hospital');

  // TEST 8: Hospital Admin can create department in OWN hospital
  const testDeptCode = `TST${Date.now().toString().slice(-4)}`;
  const createDeptRes = await fetch(`${API_BASE}/hospitals/hosp-metro-01/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${metroAdminToken}`
    },
    body: JSON.stringify({
      name: 'Neurology Critical Care Unit',
      department_code: testDeptCode,
      head_name: 'Dr. Gregory House',
      floor_location: 'Floor 6 East',
      contact_number: '+1 (555) 019-3344'
    })
  });
  const createDeptData = await createDeptRes.json();
  assert(createDeptRes.status === 201, 'Hospital Admin POST /api/hospitals/:ownId/departments returns 201 Created');
  const createdDeptId = createDeptData.data?.id;

  // TEST 9: Hospital Admin CANNOT create department in OTHER hospital
  const createOtherDeptRes = await fetch(`${API_BASE}/hospitals/hosp-stjude-02/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${metroAdminToken}`
    },
    body: JSON.stringify({
      name: 'Unauthorized Dept',
      department_code: 'UNAUTH-01'
    })
  });
  assert(createOtherDeptRes.status === 403, 'Hospital Admin creating department in other hospital blocked with 403 Forbidden');

  // TEST 10: Hospital Admin can update department in OWN hospital
  const updateDeptRes = await fetch(`${API_BASE}/departments/${createdDeptId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${metroAdminToken}`
    },
    body: JSON.stringify({
      head_name: 'Dr. Stephen Strange',
      floor_location: 'Floor 7 Penthouse'
    })
  });
  const updateDeptData = await updateDeptRes.json();
  assert(updateDeptRes.status === 200, 'Hospital Admin PUT /api/departments/:ownDeptId returns 200 OK');
  assert(updateDeptData.data?.head_name === 'Dr. Stephen Strange', 'Department head name updated properly');

  // TEST 11: Hospital Admin CANNOT update department in OTHER hospital
  const updateOtherDeptRes = await fetch(`${API_BASE}/departments/dept-s2-icu`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${metroAdminToken}`
    },
    body: JSON.stringify({
      head_name: 'Hacker Attempt'
    })
  });
  assert(updateOtherDeptRes.status === 403, 'Hospital Admin updating other hospital department blocked with 403 Forbidden');

  // TEST 12: Hospital Admin can delete department in OWN hospital
  const deleteDeptRes = await fetch(`${API_BASE}/departments/${createdDeptId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${metroAdminToken}` }
  });
  assert(deleteDeptRes.status === 200, 'Hospital Admin DELETE /api/departments/:ownDeptId returns 200 OK');

  // TEST 13: Clean up test hospital
  const deleteHospRes = await fetch(`${API_BASE}/hospitals/${createdHospId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  // Coordinator is not ADMIN so delete returns 403 as expected
  assert(deleteHospRes.status === 403, 'Coordinator cannot DELETE hospital (Admin only privilege)');

  logger.info('==============================================================');
  logger.info(`  ALL HOSPITAL & DEPT TESTS PASSED: ${passed}/${total} SUCCESSFUL! `);
  logger.info('==============================================================');
}

runHospitalDeptTests()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    logger.error('Hospital/Dept test failure:', err);
    process.exit(1);
  });
