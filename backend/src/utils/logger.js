/**
 * Basic structured logger for MedSync API
 */
const logger = {
  info: (msg, meta = '') => {
    console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()} - ${msg}`, meta ? meta : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()} - ${msg}`, meta ? meta : '');
  },
  error: (msg, err = '') => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} - ${msg}`, err ? err : '');
  },
  db: (msg, meta = '') => {
    console.log(`\x1b[35m[DATABASE]\x1b[0m ${new Date().toISOString()} - ${msg}`, meta ? meta : '');
  }
};

module.exports = logger;
