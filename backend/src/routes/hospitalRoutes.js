const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const departmentController = require('../controllers/departmentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All hospital routes require authentication
router.use(authenticateToken);

// Hospital CRUD
router.get('/', hospitalController.getAllHospitals);
router.get('/:id', hospitalController.getHospitalById);
router.post('/', requireRole('COORDINATOR', 'ADMIN'), hospitalController.createHospital);
router.put('/:id', requireRole('COORDINATOR', 'HOSPITAL_ADMIN', 'ADMIN'), hospitalController.updateHospital);
router.delete('/:id', requireRole('ADMIN'), hospitalController.deleteHospital);

// Nested Department routes under hospital
router.get('/:hospitalId/departments', departmentController.getDepartmentsByHospital);
router.post('/:hospitalId/departments', requireRole('COORDINATOR', 'HOSPITAL_ADMIN', 'ADMIN'), departmentController.createDepartment);

module.exports = router;
