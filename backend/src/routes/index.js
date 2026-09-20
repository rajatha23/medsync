const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const coordinatorRoutes = require('./coordinatorRoutes');
const hospitalAdminRoutes = require('./hospitalAdminRoutes');
const hospitalRoutes = require('./hospitalRoutes');
const departmentRoutes = require('./departmentRoutes');
const resourceRoutes = require('./resourceRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const emergencyRoutes = require('./emergencyRoutes');
const matchingRoutes = require('./matchingRoutes');
const reservationRoutes = require('./reservationRoutes');
const simulationRoutes = require('./simulationRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/hospital-admin', hospitalAdminRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/departments', departmentRoutes);
router.use('/resources', resourceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/emergency-requests', emergencyRoutes);
router.use('/matching', matchingRoutes);
router.use('/reservations', reservationRoutes);
router.use('/simulation', simulationRoutes);
router.use('/notifications', notificationRoutes);

// Root API index info
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MedSync API - Smart Hospital Resource Coordination Platform',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      coordinator: {
        overview: 'GET /api/coordinator/overview',
        hospitals: 'GET /api/coordinator/hospitals',
        emergencies: 'POST /api/coordinator/emergency-requests',
        analytics: 'GET /api/coordinator/analytics'
      },
      hospitalAdmin: {
        hospital: 'GET /api/hospital-admin/hospital',
        updateResource: 'PUT /api/hospital-admin/resources/:resourceId',
        incomingRequests: 'GET /api/hospital-admin/incoming-requests',
        updateRequestStatus: 'PATCH /api/hospital-admin/requests/:requestId/status'
      }
    }
  });
});

module.exports = router;
