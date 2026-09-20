const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All simulation operations require authenticated coordinator or admin
router.use(authenticateToken);
router.use(requireRole('COORDINATOR', 'ADMIN'));

// POST /api/simulation/run - In-memory scenario simulation projection
router.post('/run', simulationController.runSimulation);

// POST /api/simulation/apply - Explicitly commit simulation to live database
router.post('/apply', simulationController.applySimulation);

// POST /api/simulation/cleanup - Cancel synthetic requests & release synthetic holds
router.post('/cleanup', simulationController.cleanupSimulation);

module.exports = router;
