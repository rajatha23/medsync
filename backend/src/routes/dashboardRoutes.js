const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All dashboard overview routes require authentication
router.use(authenticateToken);

// GET /api/dashboard/overview - Coordinator Command Center live overview
router.get('/overview', dashboardController.getOverview);

module.exports = router;
