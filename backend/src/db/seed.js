const fs = require('fs');
const path = require('path');
const { pool } = require('./index');
const logger = require('../utils/logger');

async function runSeed() {
  const client = await pool.connect();
  try {
    logger.info('Starting database seeding with synthetic medical data...');
    const seedPath = path.resolve(__dirname, '../../../database/seeds/001_seed_synthetic_data.sql');

    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    logger.info('Database seeded successfully!');

    // Gather summary statistics
    const statsQueries = [
      { name: 'Hospitals', sql: 'SELECT COUNT(*) as count FROM hospitals' },
      { name: 'Users', sql: 'SELECT COUNT(*) as count FROM users' },
      { name: 'Departments', sql: 'SELECT COUNT(*) as count FROM departments' },
      { name: 'Resources', sql: 'SELECT COUNT(*) as count FROM resources' },
      { name: 'ICU Beds', sql: "SELECT COUNT(*) as count, SUM(total_capacity) as total, SUM(available_quantity) as available FROM resources WHERE resource_type = 'ICU_BED'" },
      { name: 'General Beds', sql: "SELECT COUNT(*) as count, SUM(total_capacity) as total, SUM(available_quantity) as available FROM resources WHERE resource_type = 'GENERAL_BED'" },
      { name: 'Blood Inventories', sql: "SELECT COUNT(*) as count, SUM(total_capacity) as total, SUM(available_quantity) as available FROM resources WHERE category = 'BLOOD'" },
      { name: 'Ventilators', sql: "SELECT COUNT(*) as count, SUM(total_capacity) as total, SUM(available_quantity) as available FROM resources WHERE resource_type = 'VENTILATOR'" },
      { name: 'Emergency Requests', sql: 'SELECT COUNT(*) as count FROM emergency_requests' },
      { name: 'Active Reservations', sql: 'SELECT COUNT(*) as count FROM reservations' },
      { name: 'Notifications', sql: 'SELECT COUNT(*) as count FROM notifications' }
    ];

    logger.info('--- SEEDING SUMMARY STATISTICS ---');
    for (const item of statsQueries) {
      const res = await client.query(item.sql);
      const row = res.rows[0];
      if (row.total !== undefined) {
        logger.info(`  • ${item.name}: ${row.count} records (Total Capacity: ${row.total}, Available: ${row.available})`);
      } else {
        logger.info(`  • ${item.name}: ${row.count} records`);
      }
    }
    logger.info('-----------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runSeed()
    .then(() => {
      logger.info('Seed process finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Fatal seed error:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
