const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Department operations by ID
router.get('/:id', departmentController.getDepartmentById);
router.put('/:id', requireRole('COORDINATOR', 'HOSPITAL_ADMIN', 'ADMIN'), departmentController.updateDepartment);
router.delete('/:id', requireRole('HOSPITAL_ADMIN', 'ADMIN'), departmentController.deleteDepartment);

module.exports = router;
