const { pool } = require('./index');
const logger = require('../utils/logger');

async function runDatabaseTests() {
  const client = await pool.connect();
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      logger.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    logger.info(`✅ PASS: ${message}`);
  }

  try {
    logger.info('====================================================');
    logger.info('  RUNNING MEDSYNC POSTGRESQL DATABASE TEST SUITE    ');
    logger.info('====================================================');

    // TEST 1: Table Existence (All 9 Required Tables)
    const requiredTables = [
      'users',
      'hospitals',
      'departments',
      'resources',
      'emergency_requests',
      'request_resources',
      'reservations',
      'notifications',
      'resource_updates'
    ];

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const presentTables = tablesRes.rows.map(r => r.table_name);

    for (const table of requiredTables) {
      assert(presentTables.includes(table), `Table "${table}" exists in public schema`);
    }

    // TEST 2: Hospital Dataset Count (>= 5 required)
    const hospRes = await client.query('SELECT COUNT(*) as count FROM hospitals');
    const hospCount = parseInt(hospRes.rows[0].count, 10);
    assert(hospCount >= 5, `At least 5 hospitals exist (Found: ${hospCount})`);

    // TEST 3: Department -> Hospital Foreign Key Relationship
    const deptRes = await client.query(`
      SELECT d.id, d.name, h.name as hospital_name
      FROM departments d
      JOIN hospitals h ON d.hospital_id = h.id
      LIMIT 5;
    `);
    assert(deptRes.rows.length >= 5, `Departments correctly join with parent hospitals via foreign key`);

    // TEST 4: Resources Relationship (Hospital -> Department -> Resources)
    const resJoined = await client.query(`
      SELECT r.id, r.resource_type, r.category, r.total_capacity, r.available_quantity,
             d.name as department_name, h.name as hospital_name
      FROM resources r
      JOIN departments d ON r.department_id = d.id
      JOIN hospitals h ON r.hospital_id = h.id
      LIMIT 10;
    `);
    assert(resJoined.rows.length >= 10, `Resources correctly reference both Department and Hospital`);

    // TEST 5: Computed Available Quantity Integrity
    const calcCheck = await client.query(`
      SELECT id, resource_type, total_capacity, occupied_quantity, reserved_quantity, available_quantity,
             (total_capacity - occupied_quantity - reserved_quantity) as expected_available
      FROM resources
      WHERE available_quantity != (total_capacity - occupied_quantity - reserved_quantity);
    `);
    assert(calcCheck.rows.length === 0, `All resources maintain exact computed available_quantity = (total - occupied - reserved)`);

    // TEST 6: Constraint - Prevent Negative Resource Headroom
    let constraintTriggered = false;
    try {
      await client.query(`
        INSERT INTO resources (id, hospital_id, department_id, category, resource_type, total_capacity, occupied_quantity, reserved_quantity)
        VALUES ('res-test-invalid', 'hosp-metro-01', 'dept-m1-icu', 'BED', 'TEST_BED', 10, 8, 5);
      `);
    } catch (err) {
      constraintTriggered = true;
      assert(err.code === '23514', `Check constraint prevents negative available quantities (total < occupied + reserved)`);
    }
    assert(constraintTriggered, `Negative headroom insert correctly rejected by database constraint`);

    // TEST 7: Constraint - Foreign Key Referential Integrity
    let fkTriggered = false;
    try {
      await client.query(`
        INSERT INTO departments (id, hospital_id, name, department_code)
        VALUES ('dept-fake', 'non-existent-hospital-999', 'Fake Dept', 'FAKE-01');
      `);
    } catch (err) {
      fkTriggered = true;
      assert(err.code === '23503', `Foreign key violation prevents orphan departments`);
    }
    assert(fkTriggered, `Invalid hospital_id foreign key correctly rejected by database`);

    // TEST 8: Specific Medical Assets Coverage
    const assetsCheck = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE resource_type = 'ICU_BED') as icu_beds,
        COUNT(*) FILTER (WHERE resource_type = 'GENERAL_BED') as general_beds,
        COUNT(*) FILTER (WHERE resource_type = 'VENTILATOR') as ventilators,
        COUNT(*) FILTER (WHERE category IN ('EMERGENCY_CAPACITY', 'CAPACITY')) as emergency_capacity,
        COUNT(DISTINCT resource_type) FILTER (WHERE category = 'BLOOD') as blood_groups_count
      FROM resources;
    `);
    const assets = assetsCheck.rows[0];
    assert(parseInt(assets.icu_beds, 10) >= 5, `ICU Beds configured across hospitals (${assets.icu_beds} facilities)`);
    assert(parseInt(assets.general_beds, 10) >= 5, `General Beds configured across hospitals (${assets.general_beds} facilities)`);
    assert(parseInt(assets.ventilators, 10) >= 4, `Mechanical Ventilators configured across hospitals (${assets.ventilators} facilities)`);
    assert(parseInt(assets.emergency_capacity, 10) >= 4, `Emergency bay capacity configured (${assets.emergency_capacity} records)`);
    assert(parseInt(assets.blood_groups_count, 10) === 8, `All 8 blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-) represented in blood depository`);

    // TEST 9: Emergency Request -> Required Resources -> Reservations -> Resources Chain
    const chainCheck = await client.query(`
      SELECT 
        er.tracking_code,
        rr.resource_type as requested_resource,
        rr.required_quantity,
        resv.reserved_quantity,
        resv.status as reservation_status,
        h.name as reserved_at_hospital
      FROM emergency_requests er
      JOIN request_resources rr ON er.id = rr.emergency_request_id
      JOIN reservations resv ON er.id = resv.emergency_request_id
      JOIN hospitals h ON resv.hospital_id = h.id
      LIMIT 3;
    `);
    assert(chainCheck.rows.length >= 3, `Full emergency dispatch chain (Request -> Required Resources -> Reservations -> Hospital) verified`);

    // TEST 10: User Role Mapping
    const userRoleCheck = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY count DESC;
    `);
    assert(userRoleCheck.rows.length >= 4, `All 4 user roles represented (ADMIN, REGIONAL_COORDINATOR, HOSPITAL_COORDINATOR, PARAMEDIC)`);

    logger.info('====================================================');
    logger.info(`  ALL DATABASE TESTS PASSED: ${passedTests}/${totalTests} TESTS SUCCESSFUL! `);
    logger.info('====================================================');
    return true;
  } catch (err) {
    logger.error(`Database test suite failed: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runDatabaseTests()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      process.exit(1);
    });
}

module.exports = { runDatabaseTests };
