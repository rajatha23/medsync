const { testConnection } = require('../db');

/**
 * Health check service logic
 */
const getHealthStatus = async () => {
  const dbStatus = await testConnection();

  return {
    status: 'ok',
    service: 'MedSync API - Hospital Resource Coordination Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      type: 'PostgreSQL',
      connected: dbStatus.connected,
      details: dbStatus.message,
      ...(dbStatus.database && { databaseName: dbStatus.database }),
      ...(dbStatus.timestamp && { dbTimestamp: dbStatus.timestamp })
    },
    environment: process.env.NODE_ENV || 'development'
  };
};

module.exports = {
  getHealthStatus
};
