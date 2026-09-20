const fs = require('fs');
const path = require('path');
const { pool } = require('./index');
const logger = require('../utils/logger');

async function runMigrations() {
  const client = await pool.connect();
  try {
    logger.info('Starting PostgreSQL schema migration...');
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    logger.info(`Found ${files.length} migration file(s): ${files.join(', ')}`);

    // Execute schema migrations inside a transaction
    await client.query('BEGIN');
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      logger.info(`  Executed migration: ${file}`);
    }
    await client.query('COMMIT');

    logger.info('Schema migration completed successfully!');

    // Query tables created
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables = res.rows.map(r => r.table_name);
    logger.info(`Verified public tables in database (${tables.length}): ${tables.join(', ')}`);
    return tables;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Fatal migration error:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
