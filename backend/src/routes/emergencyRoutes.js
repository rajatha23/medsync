const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const matchingController = require('../controllers/matchingController');
const reservationController = require('../controllers/reservationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All emergency request operations require authentication
router.use(authenticateToken);

// POST /api/emergency-requests - Create emergency request
router.post('/', emergencyController.createEmergencyRequest);

// GET /api/emergency-requests - List emergency requests with filtering
router.get('/', emergencyController.getEmergencyRequests);

// GET /api/emergency-requests/:id - Get single emergency request with timeline
router.get('/:id', emergencyController.getEmergencyRequestById);

// GET /api/emergency-requests/:id/matching-hospitals - Smart Resource Matching
router.get('/:id/matching-hospitals', matchingController.getMatchesForRequest);

// POST /api/emergency-requests/:id/release-reservations - Release all reservations for request
router.post('/:id/release-reservations', reservationController.releaseAllForRequest);

// PUT /api/emergency-requests/:id/status - Update emergency request status
router.put('/:id/status', emergencyController.updateEmergencyStatus);

module.exports = router;
