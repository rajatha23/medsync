const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All matching routes require authentication
router.use(authenticateToken);

// GET /api/matching/emergency-requests/:id
router.get('/emergency-requests/:id', matchingController.getMatchesForRequest);

// POST /api/matching/preview
router.post('/preview', matchingController.previewMatches);

module.exports = router;
