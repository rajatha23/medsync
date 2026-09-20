const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All reservation routes require authentication
router.use(authenticateToken);

// POST /api/reservations - Create reservation
router.post('/', reservationController.createReservation);

// GET /api/reservations/emergency-request/:id - Get reservations for an incident
router.get('/emergency-request/:id', reservationController.getReservationsForRequest);

// GET /api/reservations/emergency-request/:id/history - Get reservation history ledger
router.get('/emergency-request/:id/history', reservationController.getReservationHistory);

// POST /api/reservations/:id/release - Release / cancel a reservation
router.post('/:id/release', reservationController.releaseReservation);

module.exports = router;
