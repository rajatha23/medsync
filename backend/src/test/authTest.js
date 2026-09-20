const logger = require('../utils/logger');

const API_BASE = 'http://localhost:5000/api';

async function runAuthTests() {
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

  logger.info('========================================================');
  logger.info('  RUNNING MEDSYNC AUTHENTICATION & RBAC TEST SUITE      ');
  logger.info('========================================================');

  // TEST 1: Coordinator Login
  const coordLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'coordinator@medsync.demo',
      password: 'Password123!'
    })
  });
  const coordLoginData = await coordLoginRes.json();
  assert(coordLoginRes.status === 200, 'Coordinator login returns 200 OK');
  assert(coordLoginData.data?.token !== undefined, 'Coordinator login returns JWT token');
  assert(coordLoginData.data?.user?.role === 'COORDINATOR', 'Coordinator user has role "COORDINATOR"');
  const coordToken = coordLoginData.data.token;

  // TEST 2: Hospital Admin Login
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin.metro@medsync.demo',
      password: 'Password123!'
    })
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200, 'Hospital Admin login returns 200 OK');
  assert(adminLoginData.data?.user?.role === 'HOSPITAL_ADMIN', 'User has role "HOSPITAL_ADMIN"');
  assert(adminLoginData.data?.user?.hospital_id === 'hosp-metro-01', 'Hospital Admin assigned to "hosp-metro-01"');
  const adminToken = adminLoginData.data.token;

  // TEST 3: Invalid Password Rejection
  const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'coordinator@medsync.demo',
      password: 'WrongPassword999!'
    })
  });
  assert(badLoginRes.status === 401, 'Invalid password correctly rejected with 401 Unauthorized');

  // TEST 4: Get Current User with Token
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, 'GET /api/auth/me returns 200 OK');
  assert(meData.data?.user?.email === 'coordinator@medsync.demo', 'GET /api/auth/me returns authenticated user details');

  // TEST 5: Unauthenticated Access Rejection
  const noTokenRes = await fetch(`${API_BASE}/auth/me`);
  assert(noTokenRes.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

  // TEST 6: Coordinator can access /api/coordinator/overview
  const coordOverviewRes = await fetch(`${API_BASE}/coordinator/overview`, {
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  const coordOverviewData = await coordOverviewRes.json();
  assert(coordOverviewRes.status === 200, 'Coordinator can access /api/coordinator/overview');
  assert(coordOverviewData.data?.hospitals?.length >= 5, 'Coordinator overview lists all hospitals');

  // TEST 7: Hospital Admin CANNOT access /api/coordinator/overview (RBAC)
  const adminForbiddenRes = await fetch(`${API_BASE}/coordinator/overview`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminForbiddenRes.status === 403, 'Hospital Admin accessing /coordinator/overview correctly blocked with 403 Forbidden');

  // TEST 8: Hospital Admin can access their own /api/hospital-admin/hospital
  const hospAdminRes = await fetch(`${API_BASE}/hospital-admin/hospital`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const hospAdminData = await hospAdminRes.json();
  assert(hospAdminRes.status === 200, 'Hospital Admin can access /api/hospital-admin/hospital');
  assert(hospAdminData.data?.hospital?.id === 'hosp-metro-01', 'Hospital Admin receives their own assigned hospital details');

  // TEST 9: Coordinator CANNOT access /api/hospital-admin/hospital (RBAC)
  const coordForbiddenRes = await fetch(`${API_BASE}/hospital-admin/hospital`, {
    headers: { 'Authorization': `Bearer ${coordToken}` }
  });
  assert(coordForbiddenRes.status === 403, 'Coordinator accessing /hospital-admin/hospital correctly blocked with 403 Forbidden');

  // TEST 10: Hospital Admin CANNOT update another hospital's resources (Isolation)
  const crossHospUpdateRes = await fetch(`${API_BASE}/hospital-admin/resources/res-s2-icu`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      total_capacity: 25,
      occupied_quantity: 15,
      reserved_quantity: 1
    })
  });
  assert(crossHospUpdateRes.status === 403, 'Hospital Admin updating another hospital resource blocked with 403 Forbidden');

  // TEST 11: Hospital Admin CAN update their OWN hospital resource
  const ownHospUpdateRes = await fetch(`${API_BASE}/hospital-admin/resources/res-m1-icu`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      total_capacity: 30,
      occupied_quantity: 14,
      reserved_quantity: 2
    })
  });
  const ownHospUpdateData = await ownHospUpdateRes.json();
  assert(ownHospUpdateRes.status === 200, 'Hospital Admin successfully updates their own hospital resource');
  assert(ownHospUpdateData.data?.id === 'res-m1-icu', 'Own resource updated returned matching resource ID');

  // TEST 12: Registration Endpoint Validation
  const newEmail = `demo.tester.${Date.now()}@medsync.demo`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Regional Dispatcher',
      email: newEmail,
      password: 'Password123!',
      role: 'COORDINATOR'
    })
  });
  const registerData = await registerRes.json();
  assert(registerRes.status === 201, 'POST /api/auth/register creates new coordinator with 201 Created');
  assert(registerData.data?.user?.email === newEmail, 'Registration returns created user profile');

  // TEST 13: Registration fails if HOSPITAL_ADMIN lacks hospital_id
  const invalidAdminRegisterRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Orphan Admin',
      email: `orphan.${Date.now()}@medsync.demo`,
      password: 'Password123!',
      role: 'HOSPITAL_ADMIN'
    })
  });
  assert(invalidAdminRegisterRes.status === 400, 'HOSPITAL_ADMIN registration without hospital_id rejected with 400 Bad Request');

  logger.info('========================================================');
  logger.info(`  ALL AUTH & RBAC TESTS PASSED: ${passed}/${total} SUCCESSFUL! `);
  logger.info('========================================================');
}

runAuthTests()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    logger.error('Auth test failure:', err);
    process.exit(1);
  });
