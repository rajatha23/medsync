const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All resource routes require authentication
router.use(authenticateToken);

// Summary KPI endpoint (accessible by both COORDINATOR and HOSPITAL_ADMIN)
router.get('/summary', resourceController.getResourceSummary);

// View list of resources (accessible by both roles; scoped by role)
router.get('/', resourceController.getAllResources);

// View single resource details
router.get('/:id', resourceController.getResourceById);

// Hospital Admin only: create new resource for their hospital
router.post('/', requireRole('HOSPITAL_ADMIN'), resourceController.createResource);

// Hospital Admin only: update resource (verified inside service to be their hospital)
router.put('/:id', requireRole('HOSPITAL_ADMIN'), resourceController.updateResource);

// Hospital Admin only: delete resource
router.delete('/:id', requireRole('HOSPITAL_ADMIN'), resourceController.deleteResource);

module.exports = router;
