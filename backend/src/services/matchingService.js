const { query } = require('../db');

// Earth radius in kilometers for Haversine distance
const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculate Haversine distance between two sets of GPS coordinates in kilometers
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Service for Smart Resource Matching (Phase 8)
 * Evaluates real-time hospital resource capacity against incident demand.
 */
class MatchingService {
  /**
   * Find matching hospitals for a specific emergency request
   * @param {string} emergencyRequestId 
   * @param {Object} options 
   */
  async findMatchingHospitalsForRequest(emergencyRequestId, options = {}) {
    // 1. Fetch the emergency request details
    const reqRes = await query(`
      SELECT 
        id, tracking_code, priority, incident_category, patient_reference,
        incident_latitude, incident_longitude, incident_address,
        status, assigned_hospital_id, notes, created_at
      FROM emergency_requests
      WHERE id = $1;
    `, [emergencyRequestId]);

    if (reqRes.rows.length === 0) {
      const err = new Error(`Emergency request with ID '${emergencyRequestId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const emergency = reqRes.rows[0];

    // 2. Fetch demanded resources for this incident
    const rrRes = await query(`
      SELECT id, resource_type, required_quantity, fulfilled_quantity, status
      FROM request_resources
      WHERE emergency_request_id = $1
      ORDER BY resource_type ASC;
    `, [emergencyRequestId]);

    const requiredResources = rrRes.rows;

    // 3. Perform matching across the network
    const matchResults = await this.evaluateHospitalsForDemand({
      incidentLatitude: Number(emergency.incident_latitude),
      incidentLongitude: Number(emergency.incident_longitude),
      requiredResources,
      priority: emergency.priority,
      options
    });

    return {
      emergency_request: {
        id: emergency.id,
        tracking_code: emergency.tracking_code,
        priority: emergency.priority,
        incident_category: emergency.incident_category,
        patient_reference: emergency.patient_reference,
        location: emergency.incident_address,
        latitude: Number(emergency.incident_latitude),
        longitude: Number(emergency.incident_longitude),
        status: emergency.status,
        assigned_hospital_id: emergency.assigned_hospital_id
      },
      demanded_resources: requiredResources.map(r => ({
        resource_type: r.resource_type,
        required_quantity: Number(r.required_quantity),
        fulfilled_quantity: Number(r.fulfilled_quantity || 0)
      })),
      summary: {
        total_facilities_evaluated: matchResults.length,
        full_matches: matchResults.filter(m => m.classification === 'FULL MATCH').length,
        partial_matches: matchResults.filter(m => m.classification === 'PARTIAL MATCH').length,
        no_matches: matchResults.filter(m => m.classification === 'NO MATCH').length
      },
      hospitals: matchResults
    };
  }

  /**
   * Preview matching hospitals for arbitrary coordinates and demanded resources
   * @param {Object} params - { incidentLatitude, incidentLongitude, requiredResources, priority }
   */
  async previewMatches(params) {
    const {
      incidentLatitude = 40.7128,
      incidentLongitude = -74.0060,
      requiredResources = [],
      priority = 'MEDIUM',
      options = {}
    } = params;

    const matchResults = await this.evaluateHospitalsForDemand({
      incidentLatitude: Number(incidentLatitude),
      incidentLongitude: Number(incidentLongitude),
      requiredResources,
      priority,
      options
    });

    return {
      demanded_resources: requiredResources,
      summary: {
        total_facilities_evaluated: matchResults.length,
        full_matches: matchResults.filter(m => m.classification === 'FULL MATCH').length,
        partial_matches: matchResults.filter(m => m.classification === 'PARTIAL MATCH').length,
        no_matches: matchResults.filter(m => m.classification === 'NO MATCH').length
      },
      hospitals: matchResults
    };
  }

  /**
   * Core Algorithmic Hospital Capacity & Resource Evaluation
   */
  async evaluateHospitalsForDemand({ incidentLatitude, incidentLongitude, requiredResources, priority, options = {} }) {
    // Fetch all hospitals with contact and geo info
    const hospitalsRes = await query(`
      SELECT 
        id, name, code, tier, trauma_level, status,
        address, city, latitude, longitude,
        contact_phone, contact_email
      FROM hospitals
      ORDER BY name ASC;
    `);

    const hospitals = hospitalsRes.rows;

    // Fetch all current resources from database
    const resourcesRes = await query(`
      SELECT 
        id, hospital_id, category, resource_type,
        total_capacity, occupied_quantity, reserved_quantity,
        available_quantity, critical_threshold, status
      FROM resources;
    `);

    // Group resources by hospital_id
    const resourcesByHospital = {};
    for (const r of resourcesRes.rows) {
      if (!resourcesByHospital[r.hospital_id]) {
        resourcesByHospital[r.hospital_id] = [];
      }
      resourcesByHospital[r.hospital_id].push(r);
    }

    const maxRadiusKm = options.maxDistanceKm || 60; // Standard urban regional radius

    const results = [];

    for (const hospital of hospitals) {
      const hospitalLat = Number(hospital.latitude);
      const hospitalLng = Number(hospital.longitude);

      // 1. Calculate Haversine Distance
      const distanceKm = calculateHaversineDistance(
        incidentLatitude,
        incidentLongitude,
        hospitalLat,
        hospitalLng
      );

      // 2. Fetch hospital resource pool
      const hospitalResources = resourcesByHospital[hospital.id] || [];

      // Calculate total capacity & utilization for this hospital
      let totalCapacity = 0;
      let totalOccupied = 0;
      let totalReserved = 0;

      for (const res of hospitalResources) {
        totalCapacity += Number(res.total_capacity || 0);
        totalOccupied += Number(res.occupied_quantity || 0);
        totalReserved += Number(res.reserved_quantity || 0);
      }

      const totalUsed = totalOccupied + totalReserved;
      const utilizationPct = totalCapacity > 0 
        ? Math.round(((totalUsed / totalCapacity) * 100) * 10) / 10 
        : 0;

      // 3. Resource Requirements Analysis
      const resourcesRequired = [];
      const resourcesAvailable = [];
      const missingResources = [];

      let totalUnitsRequired = 0;
      let totalUnitsSatisfied = 0;
      let fullySatisfiedCount = 0;
      let partiallySatisfiedCount = 0;
      let unsatisfiedCount = 0;

      if (requiredResources.length > 0) {
        for (const reqItem of requiredResources) {
          const reqType = (reqItem.resource_type || '').toUpperCase().trim();
          const reqQty = Number(reqItem.required_quantity || 1);
          totalUnitsRequired += reqQty;

          // Find this resource in hospital's inventory
          // Some resource types might match by exact type, or category
          const matchingRes = hospitalResources.find(
            r => r.resource_type === reqType || 
                 (reqType === 'GENERAL_BED' && r.category === 'BED' && r.resource_type === 'GENERAL_BED') ||
                 (reqType === 'ICU_BED' && r.resource_type === 'ICU_BED') ||
                 (reqType === 'VENTILATOR' && r.resource_type === 'VENTILATOR') ||
                 (reqType === 'EMERGENCY_BED' && (r.category === 'EMERGENCY_CAPACITY' || r.resource_type === 'AMBULANCE_BAY' || r.resource_type === 'EMERGENCY_BED'))
          );

          const availableQty = matchingRes ? Math.max(0, Number(matchingRes.available_quantity || 0)) : 0;
          const missingQty = Math.max(0, reqQty - availableQty);
          const satisfiedUnits = Math.min(reqQty, availableQty);
          totalUnitsSatisfied += satisfiedUnits;

          resourcesRequired.push({
            resource_type: reqType,
            quantity: reqQty
          });

          resourcesAvailable.push({
            resource_type: reqType,
            available_quantity: availableQty,
            total_capacity: matchingRes ? Number(matchingRes.total_capacity) : 0,
            status: matchingRes ? matchingRes.status : 'NOT_STOCKED'
          });

          if (missingQty > 0) {
            missingResources.push({
              resource_type: reqType,
              required_quantity: reqQty,
              available_quantity: availableQty,
              missing_quantity: missingQty
            });

            if (availableQty > 0) {
              partiallySatisfiedCount++;
            } else {
              unsatisfiedCount++;
            }
          } else {
            fullySatisfiedCount++;
          }
        }
      } else {
        // If no explicit resources were requested, check general emergency / ICU capacity
        const erCap = hospitalResources.find(r => r.category === 'EMERGENCY_CAPACITY' || r.resource_type === 'AMBULANCE_BAY');
        const erAvailable = erCap ? Number(erCap.available_quantity || 0) : 1;
        totalUnitsRequired = 1;
        totalUnitsSatisfied = erAvailable > 0 ? 1 : 0;
        if (erAvailable > 0) fullySatisfiedCount = 1;
        else unsatisfiedCount = 1;
      }

      // 4. Match Classification Logic
      let classification = 'NO MATCH';
      const isHospitalOffline = hospital.status === 'OFFLINE' || hospital.status === 'LOCKDOWN' || hospital.status === 'CLOSED';
      const isHospitalDivert = hospital.status === 'DIVERT';
      const isHospitalSurge = hospital.status === 'SURGE';

      const fulfillmentRatio = totalUnitsRequired > 0 ? (totalUnitsSatisfied / totalUnitsRequired) : 1.0;
      const allRequirementsFulfilled = missingResources.length === 0;

      if (isHospitalOffline) {
        classification = 'NO MATCH';
      } else if (allRequirementsFulfilled && !isHospitalDivert) {
        // All required items available and facility open
        classification = 'FULL MATCH';
      } else if (totalUnitsSatisfied > 0 || (allRequirementsFulfilled && isHospitalDivert)) {
        // Has partial resources, or has full resources but is on divert
        classification = 'PARTIAL MATCH';
      } else {
        classification = 'NO MATCH';
      }

      // 5. Transparent & Explainable Coordination Score (0–100)
      // Score = Resource Score (50 max) + Proximity Score (30 max) + Headroom Score (20 max) - Operational Penalty
      let resourceScore = 0;
      let proximityScore = 0;
      let headroomScore = 0;
      let operationalPenalty = 0;

      if (!isHospitalOffline) {
        // Resource fulfillment component (0 - 50 points)
        resourceScore = Math.round(fulfillmentRatio * 50.0 * 10) / 10;

        // Proximity component (0 - 30 points)
        // Linear decay up to 50 km
        const proxFactor = Math.max(0, 1 - (distanceKm / 50.0));
        proximityScore = Math.round(proxFactor * 30.0 * 10) / 10;

        // Capacity Headroom component (0 - 20 points)
        // Less utilized hospitals receive higher score
        const headroomFactor = Math.max(0, 1 - (utilizationPct / 100.0));
        headroomScore = Math.round(headroomFactor * 20.0 * 10) / 10;

        // Operational Status Adjustment
        if (isHospitalDivert) {
          operationalPenalty = 25.0; // Divert penalty
        } else if (isHospitalSurge) {
          operationalPenalty = 10.0; // Surge penalty
        }
      }

      let rawTotalScore = resourceScore + proximityScore + headroomScore - operationalPenalty;
      if (isHospitalOffline) {
        rawTotalScore = 0;
      }
      const coordinationScore = Math.max(0, Math.min(100, Math.round(rawTotalScore * 10) / 10));

      // Explainability text
      const explanationText = isHospitalOffline
        ? 'Facility is OFFLINE. Cannot accept inbound emergency dispatches.'
        : `Resource fulfillment contributed ${resourceScore}/50 pts (${Math.round(fulfillmentRatio * 100)}% satisfied), distance of ${distanceKm} km contributed ${proximityScore}/30 pts, capacity headroom (${100 - Math.round(utilizationPct)}% free) contributed ${headroomScore}/20 pts${operationalPenalty > 0 ? `, with a -${operationalPenalty} pt penalty for ${hospital.status} status` : ''}.`;

      results.push({
        hospital: {
          id: hospital.id,
          name: hospital.name,
          code: hospital.code,
          tier: hospital.tier,
          trauma_level: hospital.trauma_level,
          status: hospital.status,
          address: hospital.address,
          city: hospital.city,
          latitude: hospitalLat,
          longitude: hospitalLng,
          contact_phone: hospital.contact_phone
        },
        distance_km: distanceKm,
        current_utilization_pct: utilizationPct,
        operational_status: hospital.status,
        classification, // 'FULL MATCH' | 'PARTIAL MATCH' | 'NO MATCH'
        coordination_score: coordinationScore,
        resources_required: resourcesRequired,
        resources_available: resourcesAvailable,
        missing_resources: missingResources,
        fulfillment: {
          ratio: Math.round(fulfillmentRatio * 100) / 100,
          percentage: Math.round(fulfillmentRatio * 100),
          units_required: totalUnitsRequired,
          units_satisfied: totalUnitsSatisfied,
          missing_count: missingResources.length
        },
        score_breakdown: {
          total_score: coordinationScore,
          resource_score: resourceScore,
          max_resource_score: 50,
          proximity_score: proximityScore,
          max_proximity_score: 30,
          headroom_score: headroomScore,
          max_headroom_score: 20,
          operational_penalty: operationalPenalty,
          explanation: explanationText,
          disclaimer: 'This score is computed strictly for logistical resource coordination and dispatch routing. It does not constitute medical advice or clinical triage prioritization.'
        }
      });
    }

    // Sort order:
    // 1. FULL MATCH first, then PARTIAL MATCH, then NO MATCH
    // 2. Within classification: highest coordination score descending
    // 3. Tie-breaker: shortest distance ascending
    results.sort((a, b) => {
      const classRank = { 'FULL MATCH': 1, 'PARTIAL MATCH': 2, 'NO MATCH': 3 };
      const rankDiff = classRank[a.classification] - classRank[b.classification];
      if (rankDiff !== 0) return rankDiff;

      const scoreDiff = b.coordination_score - a.coordination_score;
      if (scoreDiff !== 0) return scoreDiff;

      return a.distance_km - b.distance_km;
    });

    return results;
  }
}

module.exports = new MatchingService();
