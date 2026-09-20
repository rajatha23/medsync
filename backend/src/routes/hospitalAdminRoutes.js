const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { query } = require('../db');

// All hospital admin routes require authentication and HOSPITAL_ADMIN role
router.use(authenticateToken);
router.use(requireRole('HOSPITAL_ADMIN'));

/**
 * GET /api/hospital-admin/hospital
 * View own hospital details, departments, and live resources
 */
router.get('/hospital', async (req, res, next) => {
  try {
    const hospitalId = req.user.hospital_id;

    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User is not assigned to any hospital.', statusCode: 400 }
      });
    }

    // 1. Fetch Hospital Info
    const hospRes = await query('SELECT * FROM hospitals WHERE id = $1', [hospitalId]);
    if (hospRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Hospital record not found.', statusCode: 404 }
      });
    }

    // 2. Fetch Departments & Resources for this hospital
    const resourcesRes = await query(`
      SELECT 
        r.id, r.resource_type, r.category, r.total_capacity, r.occupied_quantity,
        r.reserved_quantity, r.available_quantity, r.critical_threshold, r.unit_of_measure,
        r.status, r.updated_at,
        d.id as department_id, d.name as department_name, d.department_code
      FROM resources r
      JOIN departments d ON r.department_id = d.id
      WHERE r.hospital_id = $1
      ORDER BY r.category, r.resource_type;
    `, [hospitalId]);

    // 3. Summarized counts for their facility
    const statsRes = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN total_capacity ELSE 0 END), 0) as total_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN available_quantity ELSE 0 END), 0) as available_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN total_capacity ELSE 0 END), 0) as total_general,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN available_quantity ELSE 0 END), 0) as available_general,
        COALESCE(SUM(CASE WHEN category = 'BLOOD' THEN available_quantity ELSE 0 END), 0) as total_blood_units,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN available_quantity ELSE 0 END), 0) as available_ventilators
      FROM resources
      WHERE hospital_id = $1;
    `, [hospitalId]);

    res.json({
      success: true,
      data: {
        hospital: hospRes.rows[0],
        stats: statsRes.rows[0],
        resources: resourcesRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/hospital-admin/resources/:resourceId
 * Update resources belonging ONLY to their own hospital
 */
router.put('/resources/:resourceId', async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const { total_capacity, occupied_quantity, reserved_quantity, status } = req.body;
    const hospitalId = req.user.hospital_id;

    // Verify the resource belongs strictly to this hospital admin's facility
    const checkRes = await query('SELECT * FROM resources WHERE id = $1', [resourceId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found.', statusCode: 404 }
      });
    }

    const current = checkRes.rows[0];

    // ISOLATION ENFORCEMENT: Cannot touch another hospital's resources!
    if (current.hospital_id !== hospitalId) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: You can only update resources for your assigned hospital (${hospitalId}). This resource belongs to (${current.hospital_id}).`,
          statusCode: 403
        }
      });
    }

    const newTotal = total_capacity !== undefined ? parseInt(total_capacity, 10) : current.total_capacity;
    const newOccupied = occupied_quantity !== undefined ? parseInt(occupied_quantity, 10) : current.occupied_quantity;
    const newReserved = reserved_quantity !== undefined ? parseInt(reserved_quantity, 10) : current.reserved_quantity;
    const newStatus = status || current.status;

    if (newTotal < (newOccupied + newReserved)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid capacity values: Total capacity (${newTotal}) must be >= occupied (${newOccupied}) + reserved (${newReserved}).`,
          statusCode: 400
        }
      });
    }

    const updateRes = await query(`
      UPDATE resources
      SET total_capacity = $1,
          occupied_quantity = $2,
          reserved_quantity = $3,
          status = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND hospital_id = $6
      RETURNING *;
    `, [newTotal, newOccupied, newReserved, newStatus, resourceId, hospitalId]);

    // Log to resource_updates audit trail
    await query(`
      INSERT INTO resource_updates 
        (resource_id, hospital_id, previous_capacity, new_capacity, previous_occupied, new_occupied, previous_reserved, new_reserved, change_reason, updated_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'HOSPITAL_ADMIN_UPDATE', $9);
    `, [
      resourceId,
      hospitalId,
      current.total_capacity,
      newTotal,
      current.occupied_quantity,
      newOccupied,
      current.reserved_quantity,
      newReserved,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Resource updated successfully.',
      data: updateRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hospital-admin/incoming-requests
 * View emergency requests assigned specifically to their hospital
 */
router.get('/incoming-requests', async (req, res, next) => {
  try {
    const hospitalId = req.user.hospital_id;

    const requestsRes = await query(`
      SELECT 
        er.id, er.tracking_code, er.priority, er.incident_category, er.patient_reference,
        er.requester_name, er.requester_contact, er.incident_address, er.status,
        er.created_at, er.notes,
        COALESCE(
          json_agg(
            json_build_object(
              'resource_type', rr.resource_type,
              'required_quantity', rr.required_quantity,
              'fulfilled_quantity', rr.fulfilled_quantity,
              'status', rr.status
            )
          ) FILTER (WHERE rr.id IS NOT NULL), '[]'
        ) as required_resources
      FROM emergency_requests er
      LEFT JOIN request_resources rr ON er.id = rr.emergency_request_id
      WHERE er.assigned_hospital_id = $1 OR (er.status = 'PENDING')
      GROUP BY er.id
      ORDER BY 
        CASE er.status WHEN 'DISPATCHED' THEN 1 WHEN 'PENDING' THEN 2 ELSE 3 END,
        er.created_at DESC;
    `, [hospitalId]);

    res.json({
      success: true,
      data: requestsRes.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/hospital-admin/requests/:requestId/status
 * Accept or reject/divert incoming emergency request
 */
router.patch('/requests/:requestId/status', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, reason } = req.body;
    const hospitalId = req.user.hospital_id;

    const validStatuses = ['ACCEPTED', 'DIVERTED', 'COMPLETED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: { message: `Status must be one of: ${validStatuses.join(', ')}`, statusCode: 400 }
      });
    }

    const normalizedStatus = status.toUpperCase();

    // Check request exists
    const checkRes = await query('SELECT * FROM emergency_requests WHERE id = $1', [requestId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Emergency request not found.', statusCode: 404 }
      });
    }

    const currentReq = checkRes.rows[0];

    // If request has an assigned hospital, ensure it matches
    if (currentReq.assigned_hospital_id && currentReq.assigned_hospital_id !== hospitalId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Request is assigned to another hospital.', statusCode: 403 }
      });
    }

    const updateRes = await query(`
      UPDATE emergency_requests
      SET status = $1,
          assigned_hospital_id = $2,
          resolved_at = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          notes = CONCAT(COALESCE(notes, ''), ' [', TO_CHAR(CURRENT_TIMESTAMP, 'HH24:MI:SS'), ' ', $1::text, ': ', $3::text, ']')
      WHERE id = $4
      RETURNING *;
    `, [normalizedStatus, hospitalId, reason || 'Hospital triage status update', requestId]);

    res.json({
      success: true,
      message: `Emergency request status updated to ${normalizedStatus}.`,
      data: updateRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
