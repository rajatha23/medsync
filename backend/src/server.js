const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { testConnection } = require('./db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Mount Central API Routes
app.use('/api', routes);

// Root path redirect/info
app.get('/', (req, res) => {
  res.json({
    platform: 'MedSync - Smart Hospital Resource Coordination Platform',
    status: 'Running',
    apiHealth: '/api/health'
  });
});

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`=================================================`);
  logger.info(`  MEDSYNC Server running on http://localhost:${PORT}`);
  logger.info(`  Health Check: http://localhost:${PORT}/api/health`);
  logger.info(`  Environment:  ${process.env.NODE_ENV || 'development'}`);
  logger.info(`=================================================`);

  // Probe PostgreSQL connection on boot
  await testConnection();
});

module.exports = { app, server };
