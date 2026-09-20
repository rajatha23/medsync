const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
router.get('/', controller.list);
router.patch('/:id/read', controller.markRead);
router.post('/read-all', controller.markAllRead);
module.exports = router;
