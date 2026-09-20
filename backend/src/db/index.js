const { Pool } = require('pg');
const logger = require('../utils/logger');
require('dotenv').config();

// Create PostgreSQL connection pool
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'medsync',
    };

const pool = new Pool({
  ...poolConfig,
  connectionTimeoutMillis: 3000, // Fail fast if unreachable (3s)
  idleTimeoutMillis: 30000,
  max: 20
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err.message);
});

/**
 * Execute a SQL query using the pool
 * @param {string} text - SQL query
 * @param {Array} [params] - Query parameters
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.db(`Executed query [${duration}ms]: ${text.slice(0, 60)}...`);
  return res;
};

/**
 * Test PostgreSQL database connectivity
 * @returns {Promise<{ connected: boolean, message: string, timestamp?: string }>}
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as database_name');
    const dbTime = res.rows[0]?.current_time;
    const dbName = res.rows[0]?.database_name;
    logger.db(`PostgreSQL connected successfully to database "${dbName}" at ${dbTime}`);
    return {
      connected: true,
      database: dbName,
      timestamp: dbTime,
      message: 'PostgreSQL connection healthy'
    };
  } catch (err) {
    logger.warn(`PostgreSQL connection check failed: ${err.message}`);
    return {
      connected: false,
      message: `Database offline or unreachable: ${err.message}`
    };
  }
};

module.exports = {
  pool,
  query,
  testConnection
};
