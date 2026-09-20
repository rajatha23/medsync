const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { query } = require('../db');
const emergencyService = require('../services/emergencyService');

// All coordinator routes require authentication and COORDINATOR role
router.use(authenticateToken);
router.use(requireRole('COORDINATOR'));

/**
 * GET /api/coordinator/overview
 * Coordinator view: city-wide telemetry across all network hospitals
 */
router.get('/overview', async (req, res, next) => {
  try {
    // 1. All hospitals with aggregated metrics
    const hospitalsRes = await query(`
      SELECT 
        h.id, h.name, h.code, h.tier, h.trauma_level, h.status, h.address, h.latitude, h.longitude,
        COALESCE(SUM(CASE WHEN r.resource_type = 'ICU_BED' THEN r.total_capacity ELSE 0 END), 0) as total_icu_beds,
        COALESCE(SUM(CASE WHEN r.resource_type = 'ICU_BED' THEN r.available_quantity ELSE 0 END), 0) as available_icu_beds,
        COALESCE(SUM(CASE WHEN r.resource_type = 'GENERAL_BED' THEN r.total_capacity ELSE 0 END), 0) as total_general_beds,
        COALESCE(SUM(CASE WHEN r.resource_type = 'GENERAL_BED' THEN r.available_quantity ELSE 0 END), 0) as available_general_beds,
        COALESCE(SUM(CASE WHEN r.category = 'BLOOD' THEN r.available_quantity ELSE 0 END), 0) as total_blood_units,
        COALESCE(SUM(CASE WHEN r.resource_type = 'VENTILATOR' THEN r.available_quantity ELSE 0 END), 0) as available_ventilators
      FROM hospitals h
      LEFT JOIN resources r ON h.id = r.hospital_id
      GROUP BY h.id
      ORDER BY h.name;
    `);

    // 2. City-wide totals
    const totalsRes = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN total_capacity ELSE 0 END), 0) as total_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN available_quantity ELSE 0 END), 0) as available_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN total_capacity ELSE 0 END), 0) as total_gen,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN available_quantity ELSE 0 END), 0) as available_gen,
        COALESCE(SUM(CASE WHEN category = 'BLOOD' THEN available_quantity ELSE 0 END), 0) as available_blood,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN available_quantity ELSE 0 END), 0) as available_vent
      FROM resources;
    `);

    // 3. Active Emergency Incidents
    const emergenciesRes = await query(`
      SELECT er.id, er.tracking_code, er.priority, er.incident_category, er.patient_reference,
             er.requester_name, er.incident_address, er.status, er.created_at,
             h.name as assigned_hospital_name
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.assigned_hospital_id = h.id
      ORDER BY 
        CASE er.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        er.created_at DESC
      LIMIT 10;
    `);

    res.json({
      success: true,
      data: {
        coordinator: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        citySummary: totalsRes.rows[0],
        hospitals: hospitalsRes.rows,
        activeEmergencies: emergenciesRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/coordinator/hospitals
 * List all hospitals with full resource inventory
 */
router.get('/hospitals', async (req, res, next) => {
  try {
    const hospitalsRes = await query('SELECT * FROM hospitals ORDER BY name ASC');
    res.json({
      success: true,
      data: hospitalsRes.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/coordinator/emergency-requests
 * Coordinator creates an emergency request
 */
router.post('/emergency-requests', async (req, res, next) => {
  try {
    const {
      priority,
      incident_category,
      patient_reference,
      incident_address,
      location,
      latitude,
      longitude,
      incident_latitude = 40.7128,
      incident_longitude = -74.0060,
      notes = '',
      required_resources = []
    } = req.body;

    const requestData = {
      priority: priority || 'MEDIUM',
      incident_category: incident_category || 'TRAUMA',
      patient_reference,
      location: location || incident_address,
      latitude: latitude !== undefined ? latitude : incident_latitude,
      longitude: longitude !== undefined ? longitude : incident_longitude,
      notes,
      required_resources
    };

    const created = await emergencyService.createEmergencyRequest(requestData, req.user);

    res.status(201).json({
      success: true,
      message: 'Emergency request created successfully.',
      data: created
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/coordinator/analytics
 * Coordinator view: city-wide analytics
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const [occupancyRes, resourceRes, bloodRes, emergencyRes, responseRes] = await Promise.all([
      query(`
        SELECT h.id, h.name AS hospital_name, h.status,
               COALESCE(SUM(CASE WHEN r.category='BED' THEN r.total_capacity ELSE 0 END),0) AS total_beds,
               COALESCE(SUM(CASE WHEN r.category='BED' THEN r.occupied_quantity ELSE 0 END),0) AS occupied_beds,
               COALESCE(SUM(CASE WHEN r.category='BED' THEN r.available_quantity ELSE 0 END),0) AS available_beds,
               ROUND(COALESCE((SUM(CASE WHEN r.category='BED' THEN r.occupied_quantity ELSE 0 END)::numeric /
                 NULLIF(SUM(CASE WHEN r.category='BED' THEN r.total_capacity ELSE 0 END),0))*100,0),1) AS occupancy_rate
        FROM hospitals h LEFT JOIN resources r ON r.hospital_id=h.id
        GROUP BY h.id, h.name, h.status ORDER BY occupancy_rate DESC;`),
      query(`
        SELECT resource_type, category,
               COALESCE(SUM(total_capacity),0) total_capacity,
               COALESCE(SUM(occupied_quantity),0) occupied_quantity,
               COALESCE(SUM(reserved_quantity),0) reserved_quantity,
               COALESCE(SUM(available_quantity),0) available_quantity,
               ROUND(COALESCE((SUM(occupied_quantity+reserved_quantity)::numeric/NULLIF(SUM(total_capacity),0))*100,0),1) utilization_rate
        FROM resources GROUP BY resource_type, category ORDER BY category, resource_type;`),
      query(`
        SELECT h.name AS hospital_name, r.resource_type, r.available_quantity, r.critical_threshold,
               (r.critical_threshold-r.available_quantity) AS deficit
        FROM resources r JOIN hospitals h ON h.id=r.hospital_id
        WHERE r.category='BLOOD' AND r.available_quantity <= r.critical_threshold
        ORDER BY deficit DESC, h.name;`),
      query(`
        SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*)::int AS requests,
               COUNT(*) FILTER (WHERE priority='CRITICAL')::int AS critical,
               COUNT(*) FILTER (WHERE status IN ('COMPLETED','CANCELLED'))::int AS resolved
        FROM emergency_requests
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY 1 ORDER BY 1;`),
      query(`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (h.created_at-er.created_at))/60.0)::numeric,1) AS avg_match_minutes,
               COUNT(*) FILTER (WHERE h.created_at IS NOT NULL)::int AS matched_count
        FROM emergency_requests er
        LEFT JOIN LATERAL (
          SELECT created_at FROM emergency_status_history
          WHERE emergency_request_id=er.id AND new_status IN ('MATCH_FOUND','MATCHED','PENDING_ACCEPTANCE')
          ORDER BY created_at ASC LIMIT 1
        ) h ON TRUE
        WHERE er.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days';`)
    ]);

    const hospitalOccupancy = occupancyRes.rows.map(r => ({ ...r, total_beds:Number(r.total_beds), occupied_beds:Number(r.occupied_beds), available_beds:Number(r.available_beds), occupancy_rate:Number(r.occupancy_rate) }));
    const resourceUtilization = resourceRes.rows.map(r => ({ ...r, total_capacity:Number(r.total_capacity), occupied_quantity:Number(r.occupied_quantity), reserved_quantity:Number(r.reserved_quantity), available_quantity:Number(r.available_quantity), utilization_rate:Number(r.utilization_rate) }));
    const bloodAlerts = bloodRes.rows.map(r => ({ ...r, available_quantity:Number(r.available_quantity), critical_threshold:Number(r.critical_threshold), deficit:Math.max(0,Number(r.deficit)) }));
    const demandTrend = emergencyRes.rows.map(r => ({ day:r.day, requests:Number(r.requests), critical:Number(r.critical), resolved:Number(r.resolved) }));

    res.json({ success:true, data:{
      period:'last_7_days',
      hospitalOccupancy,
      resourceUtilization,
      bloodAlerts,
      demandTrend,
      responseMetrics:{
        avg_match_minutes: responseRes.rows[0]?.avg_match_minutes === null ? null : Number(responseRes.rows[0]?.avg_match_minutes || 0),
        matched_count:Number(responseRes.rows[0]?.matched_count || 0)
      },
      summary:{
        hospitals:hospitalOccupancy.length,
        high_utilization_hospitals:hospitalOccupancy.filter(h=>h.occupancy_rate>=80).length,
        critical_blood_alerts:bloodAlerts.filter(b=>b.available_quantity===0).length,
        total_blood_alerts:bloodAlerts.length,
        total_requests_7d:demandTrend.reduce((a,b)=>a+b.requests,0)
      }
    }});
  } catch(err) { next(err); }
});

module.exports = router;
