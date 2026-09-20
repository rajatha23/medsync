const { pool, query } = require('../db');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Service for Emergency Scenario Simulator (Synthetic Simulation Mode)
 * Allows coordinators to model crisis scenarios, project before/after resource utilization,
 * predict shortages, and view affected hospitals without modifying live data unless explicitly applied.
 */
class SimulationService {
  /**
   * Run an in-memory scenario simulation based on live database baseline telemetry
   * Guaranteed READ-ONLY with respect to persistent database state.
   */
  async runSimulation(params = {}) {
    const {
      scenarioName = 'Mass Casualty Incident (MCI)',
      casesCount = 20,
      icuDemand = 10,
      generalBedDemand = 15,
      ventilatorDemand = 5,
      bloodDemand = 20,
      incidentCategory = 'MASS_CASUALTY',
      location = 'Metropolis Central District',
      latitude = 40.7128,
      longitude = -74.0060
    } = params;

    // Validate inputs
    const numCases = parseInt(casesCount, 10);
    const numIcu = parseInt(icuDemand, 10);
    const numGen = parseInt(generalBedDemand, 10);
    const numVent = parseInt(ventilatorDemand, 10);
    const numBlood = parseInt(bloodDemand, 10);

    if (isNaN(numCases) || numCases <= 0) {
      const err = new Error('casesCount must be a positive integer.');
      err.statusCode = 400;
      throw err;
    }

    if (isNaN(numIcu) || numIcu < 0 || isNaN(numGen) || numGen < 0 || isNaN(numVent) || numVent < 0 || isNaN(numBlood) || numBlood < 0) {
      const err = new Error('Resource demand quantities must be non-negative integers.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch live database state (BEFORE)
    const hospitalsRes = await query(`
      SELECT 
        id, name, code, tier, trauma_level, status,
        address, city, latitude, longitude,
        contact_phone, contact_email
      FROM hospitals
      ORDER BY name ASC;
    `);
    const allHospitals = hospitalsRes.rows;

    const resourcesRes = await query(`
      SELECT 
        id, hospital_id, category, resource_type,
        total_capacity, occupied_quantity, reserved_quantity,
        available_quantity, critical_threshold, status
      FROM resources;
    `);
    const allResources = resourcesRes.rows;

    // Group resources by hospital_id
    const resByHospital = {};
    for (const r of allResources) {
      if (!resByHospital[r.hospital_id]) resByHospital[r.hospital_id] = [];
      resByHospital[r.hospital_id].push(r);
    }

    // Calculate BEFORE network metrics
    let beforeTotalIcu = 0, beforeAvailIcu = 0, beforeOccupiedIcu = 0, beforeReservedIcu = 0;
    let beforeTotalGen = 0, beforeAvailGen = 0, beforeOccupiedGen = 0, beforeReservedGen = 0;
    let beforeTotalVent = 0, beforeAvailVent = 0, beforeOccupiedVent = 0, beforeReservedVent = 0;
    let beforeTotalBlood = 0, beforeAvailBlood = 0;
    let beforeTotalBays = 0, beforeAvailBays = 0;

    for (const r of allResources) {
      const tot = Number(r.total_capacity || 0);
      const avail = Number(r.available_quantity || 0);
      const occ = Number(r.occupied_quantity || 0);
      const resv = Number(r.reserved_quantity || 0);

      if (r.resource_type === 'ICU_BED') {
        beforeTotalIcu += tot;
        beforeAvailIcu += avail;
        beforeOccupiedIcu += occ;
        beforeReservedIcu += resv;
      } else if (r.resource_type === 'GENERAL_BED') {
        beforeTotalGen += tot;
        beforeAvailGen += avail;
        beforeOccupiedGen += occ;
        beforeReservedGen += resv;
      } else if (r.resource_type === 'VENTILATOR') {
        beforeTotalVent += tot;
        beforeAvailVent += avail;
        beforeOccupiedVent += occ;
        beforeReservedVent += resv;
      } else if (r.category === 'BLOOD') {
        beforeTotalBlood += tot;
        beforeAvailBlood += avail;
      } else if (r.category === 'CAPACITY' || r.category === 'EMERGENCY_CAPACITY') {
        beforeTotalBays += tot;
        beforeAvailBays += avail;
      }
    }

    const beforeTotalBeds = beforeTotalIcu + beforeTotalGen;
    const beforeAvailBeds = beforeAvailIcu + beforeAvailGen;
    const beforeBedOccupancy = beforeTotalBeds > 0 ? Math.round(((beforeTotalBeds - beforeAvailBeds) / beforeTotalBeds) * 100) : 0;
    const beforeIcuUtil = beforeTotalIcu > 0 ? Math.round(((beforeTotalIcu - beforeAvailIcu) / beforeTotalIcu) * 100) : 0;
    const beforeGenUtil = beforeTotalGen > 0 ? Math.round(((beforeTotalGen - beforeAvailGen) / beforeTotalGen) * 100) : 0;
    const beforeVentUtil = beforeTotalVent > 0 ? Math.round(((beforeTotalVent - beforeAvailVent) / beforeTotalVent) * 100) : 0;

    const beforeHospitalBreakdown = {
      total: allHospitals.length,
      operational: allHospitals.filter(h => h.status !== 'OFFLINE' && h.status !== 'CLOSED').length,
      normal: allHospitals.filter(h => h.status === 'NORMAL').length,
      surge: allHospitals.filter(h => h.status === 'SURGE').length,
      divert: allHospitals.filter(h => h.status === 'DIVERT').length,
      offline: allHospitals.filter(h => h.status === 'OFFLINE' || h.status === 'CLOSED').length
    };

    // 2. Compute AFTER Projections
    // Network Shortages Calculation
    const icuShortage = Math.max(0, numIcu - beforeAvailIcu);
    const genShortage = Math.max(0, numGen - beforeAvailGen);
    const ventShortage = Math.max(0, numVent - beforeAvailVent);
    const bloodShortage = Math.max(0, numBlood - beforeAvailBlood);

    const afterAvailIcu = Math.max(0, beforeAvailIcu - numIcu);
    const afterAvailGen = Math.max(0, beforeAvailGen - numGen);
    const afterAvailVent = Math.max(0, beforeAvailVent - numVent);
    const afterAvailBlood = Math.max(0, beforeAvailBlood - numBlood);

    const afterTotalBeds = beforeTotalBeds;
    const afterAvailBeds = afterAvailIcu + afterAvailGen;
    const afterBedOccupancy = afterTotalBeds > 0 ? Math.min(100, Math.round(((afterTotalBeds - afterAvailBeds) / afterTotalBeds) * 100)) : 0;
    const afterIcuUtil = beforeTotalIcu > 0 ? Math.min(100, Math.round(((beforeTotalIcu - afterAvailIcu) / beforeTotalIcu) * 100)) : 0;
    const afterGenUtil = beforeTotalGen > 0 ? Math.min(100, Math.round(((beforeTotalGen - afterAvailGen) / beforeTotalGen) * 100)) : 0;
    const afterVentUtil = beforeTotalVent > 0 ? Math.min(100, Math.round(((beforeTotalVent - afterAvailVent) / beforeTotalVent) * 100)) : 0;

    // 3. Operational Hospital Demand Allocation & Status Shift Projection
    const operationalHospitals = allHospitals.filter(h => h.status !== 'OFFLINE' && h.status !== 'CLOSED');

    // Weight factors by trauma level & capacity
    const hospitalWeights = {};
    let totalWeight = 0;
    for (const h of operationalHospitals) {
      let weight = 1.0;
      if (h.trauma_level === 'Level 1') weight = 3.5;
      else if (h.trauma_level === 'Level 2') weight = 2.5;
      else if (h.trauma_level === 'Level 3') weight = 1.8;
      else if (h.trauma_level === 'Specialized') weight = 1.2;

      // Adjust for existing divert status
      if (h.status === 'DIVERT') weight *= 0.3;
      else if (h.status === 'SURGE') weight *= 0.7;

      hospitalWeights[h.id] = weight;
      totalWeight += weight;
    }

    const affectedHospitals = [];
    const hospitalAssignedCases = {};

    for (const h of allHospitals) {
      const isOffline = h.status === 'OFFLINE' || h.status === 'CLOSED';
      const hRes = resByHospital[h.id] || [];

      // Find hospital resource availability
      const icuRes = hRes.find(r => r.resource_type === 'ICU_BED');
      const genRes = hRes.find(r => r.resource_type === 'GENERAL_BED');
      const ventRes = hRes.find(r => r.resource_type === 'VENTILATOR');
      const bloodResList = hRes.filter(r => r.category === 'BLOOD');

      const hTotalIcu = icuRes ? Number(icuRes.total_capacity || 0) : 0;
      const hAvailIcu = icuRes ? Number(icuRes.available_quantity || 0) : 0;
      const hTotalGen = genRes ? Number(genRes.total_capacity || 0) : 0;
      const hAvailGen = genRes ? Number(genRes.available_quantity || 0) : 0;
      const hAvailVent = ventRes ? Number(ventRes.available_quantity || 0) : 0;
      const hAvailBlood = bloodResList.reduce((acc, b) => acc + Number(b.available_quantity || 0), 0);

      const hTotalBeds = hTotalIcu + hTotalGen;
      const hAvailBeds = hAvailIcu + hAvailGen;
      const hBeforeOccupancy = hTotalBeds > 0 ? Math.round(((hTotalBeds - hAvailBeds) / hTotalBeds) * 100) : 0;

      if (isOffline) {
        affectedHospitals.push({
          id: h.id,
          name: h.name,
          code: h.code,
          city: h.city,
          trauma_level: h.trauma_level,
          current_status: h.status,
          projected_status: h.status,
          status_changed: false,
          is_offline: true,
          before_available_icu: hAvailIcu,
          projected_available_icu: hAvailIcu,
          before_available_gen: hAvailGen,
          projected_available_gen: hAvailGen,
          before_available_vent: hAvailVent,
          projected_available_vent: hAvailVent,
          before_available_blood: hAvailBlood,
          projected_available_blood: hAvailBlood,
          before_occupancy_rate: hBeforeOccupancy,
          projected_occupancy_rate: hBeforeOccupancy,
          allocated_cases: 0,
          allocated_icu: 0,
          allocated_gen: 0,
          allocated_vent: 0,
          allocated_blood: 0,
          impact_summary: 'Facility offline / closed. Excluded from simulated disaster intake.'
        });
        hospitalAssignedCases[h.id] = 0;
        continue;
      }

      // Calculate share of simulated load
      const share = totalWeight > 0 ? (hospitalWeights[h.id] / totalWeight) : (1 / operationalHospitals.length);
      const allocatedCases = Math.round(numCases * share);
      hospitalAssignedCases[h.id] = allocatedCases;

      const allocatedIcu = Math.min(hAvailIcu, Math.round(numIcu * share));
      const allocatedGen = Math.min(hAvailGen, Math.round(numGen * share));
      const allocatedVent = Math.min(hAvailVent, Math.round(numVent * share));
      const allocatedBlood = Math.min(hAvailBlood, Math.round(numBlood * share));

      const projAvailIcu = Math.max(0, hAvailIcu - allocatedIcu);
      const projAvailGen = Math.max(0, hAvailGen - allocatedGen);
      const projAvailVent = Math.max(0, hAvailVent - allocatedVent);
      const projAvailBlood = Math.max(0, hAvailBlood - allocatedBlood);

      const projAvailBeds = projAvailIcu + projAvailGen;
      const projOccupancy = hTotalBeds > 0 ? Math.min(100, Math.round(((hTotalBeds - projAvailBeds) / hTotalBeds) * 100)) : 0;

      // Determine projected status shift
      let projStatus = h.status;
      if (projOccupancy >= 95 || (projAvailIcu === 0 && hTotalIcu > 0 && allocatedIcu > 0)) {
        projStatus = 'DIVERT';
      } else if (projOccupancy >= 80) {
        projStatus = 'SURGE';
      } else if (h.status !== 'DIVERT' && h.status !== 'SURGE') {
        projStatus = 'NORMAL';
      }

      let impactSummary = 'Maintains manageable operational capacity.';
      if (projStatus === 'DIVERT') {
        impactSummary = `CRITICAL: Pushed to DIVERT status. Occupancy projected at ${projOccupancy}%. ICU capacity exhausted.`;
      } else if (projStatus === 'SURGE') {
        impactSummary = `ELEVATED: Enters SURGE status. Bed occupancy reaches ${projOccupancy}%.`;
      } else if (allocatedCases > 0) {
        impactSummary = `Absorbs ${allocatedCases} simulated cases. Operating within standard margins.`;
      }

      affectedHospitals.push({
        id: h.id,
        name: h.name,
        code: h.code,
        city: h.city,
        trauma_level: h.trauma_level,
        current_status: h.status,
        projected_status: projStatus,
        status_changed: projStatus !== h.status,
        is_offline: false,
        before_available_icu: hAvailIcu,
        projected_available_icu: projAvailIcu,
        before_available_gen: hAvailGen,
        projected_available_gen: projAvailGen,
        before_available_vent: hAvailVent,
        projected_available_vent: projAvailVent,
        before_available_blood: hAvailBlood,
        projected_available_blood: projAvailBlood,
        before_occupancy_rate: hBeforeOccupancy,
        projected_occupancy_rate: projOccupancy,
        allocated_cases: allocatedCases,
        allocated_icu: allocatedIcu,
        allocated_gen: allocatedGen,
        allocated_vent: allocatedVent,
        allocated_blood: allocatedBlood,
        impact_summary: impactSummary
      });
    }

    // Sort affected hospitals by stress (divert first, surge second, then occupancy descending)
    affectedHospitals.sort((a, b) => {
      const order = { DIVERT: 1, SURGE: 2, NORMAL: 3, OFFLINE: 4, CLOSED: 4 };
      if (order[a.projected_status] !== order[b.projected_status]) {
        return (order[a.projected_status] || 9) - (order[b.projected_status] || 9);
      }
      return b.projected_occupancy_rate - a.projected_occupancy_rate;
    });

    const afterHospitalBreakdown = {
      total: allHospitals.length,
      operational: operationalHospitals.length,
      normal: affectedHospitals.filter(h => h.projected_status === 'NORMAL').length,
      surge: affectedHospitals.filter(h => h.projected_status === 'SURGE').length,
      divert: affectedHospitals.filter(h => h.projected_status === 'DIVERT').length,
      offline: affectedHospitals.filter(h => h.is_offline).length
    };

    // 4. Generate Synthetic Emergency Requests
    const simulatedRequests = [];
    const availableOperationalHosps = affectedHospitals.filter(h => !h.is_offline && h.projected_status !== 'DIVERT' && (h.before_available_icu > 0 || h.before_available_gen > 0));
    const fallbackOperationalHosps = affectedHospitals.filter(h => !h.is_offline && (h.before_available_icu > 0 || h.before_available_gen > 0));
    const receivingHospList = availableOperationalHosps.length > 0 
      ? availableOperationalHosps 
      : (fallbackOperationalHosps.length > 0 ? fallbackOperationalHosps : affectedHospitals.filter(h => !h.is_offline));
    receivingHospList.sort((a, b) => (b.before_available_icu + b.before_available_gen) - (a.before_available_icu + a.before_available_gen));

    let remainingIcuToDistribute = numIcu;
    let remainingGenToDistribute = numGen;
    let remainingVentToDistribute = numVent;
    let remainingBloodToDistribute = numBlood;

    for (let i = 0; i < numCases; i++) {
      // Deterministic priority distribution: 35% CRITICAL, 45% HIGH, 20% MEDIUM
      let priority = 'MEDIUM';
      if (i % 3 === 0) priority = 'CRITICAL';
      else if (i % 2 === 0) priority = 'HIGH';

      // Pick target assigned hospital from facilities with capacity
      const assignedHosp = receivingHospList.length > 0 ? receivingHospList[i % receivingHospList.length] : null;

      const trackingCode = `SIM-REQ-${Date.now().toString(36).toUpperCase()}-${(i + 1).toString().padStart(3, '0')}`;
      const patientRef = `SIM-PT-${(1000 + i + 1)}`;

      // Distribute resources among simulated requests
      const caseResources = [];
      const casesRemaining = numCases - i;

      // Distribute ICU
      if (remainingIcuToDistribute > 0) {
        const qty = Math.ceil(remainingIcuToDistribute / casesRemaining);
        const actualQty = Math.min(remainingIcuToDistribute, qty > 0 ? qty : 1);
        if (actualQty > 0) {
          caseResources.push({ resource_type: 'ICU_BED', required_quantity: actualQty });
          remainingIcuToDistribute -= actualQty;
        }
      }

      // Distribute General Bed
      if (remainingGenToDistribute > 0 && (caseResources.length === 0 || i % 2 === 0)) {
        const qty = Math.ceil(remainingGenToDistribute / casesRemaining);
        const actualQty = Math.min(remainingGenToDistribute, qty > 0 ? qty : 1);
        if (actualQty > 0) {
          caseResources.push({ resource_type: 'GENERAL_BED', required_quantity: actualQty });
          remainingGenToDistribute -= actualQty;
        }
      }

      // Distribute Ventilator
      if (remainingVentToDistribute > 0 && (priority === 'CRITICAL' || remainingVentToDistribute >= casesRemaining)) {
        const actualQty = 1;
        caseResources.push({ resource_type: 'VENTILATOR', required_quantity: actualQty });
        remainingVentToDistribute -= actualQty;
      }

      // Distribute Blood
      if (remainingBloodToDistribute > 0 && (i % 2 === 1 || remainingBloodToDistribute >= casesRemaining)) {
        const qty = Math.ceil(remainingBloodToDistribute / casesRemaining);
        const actualQty = Math.min(remainingBloodToDistribute, qty > 0 ? qty : 2);
        if (actualQty > 0) {
          caseResources.push({ resource_type: 'BLOOD_O_NEG', required_quantity: actualQty });
          remainingBloodToDistribute -= actualQty;
        }
      }

      // Ensure at least one resource requested
      if (caseResources.length === 0) {
        caseResources.push({ resource_type: 'GENERAL_BED', required_quantity: 1 });
      }

      simulatedRequests.push({
        id: `sim-req-${crypto.randomBytes(6).toString('hex')}`,
        tracking_code: trackingCode,
        priority,
        incident_category: incidentCategory,
        patient_reference: patientRef,
        incident_address: `${location} (Sector ${String.fromCharCode(65 + (i % 8))})`,
        incident_latitude: Number(latitude) + (Math.sin(i) * 0.03),
        incident_longitude: Number(longitude) + (Math.cos(i) * 0.03),
        status: 'SEARCHING',
        assigned_hospital_id: assignedHosp ? assignedHosp.id : null,
        assigned_hospital_name: assignedHosp ? assignedHosp.name : 'Unassigned',
        demanded_resources: caseResources,
        notes: `[SYNTHETIC SIMULATION] Scenario: ${scenarioName}. Generated for capacity stress testing. Not a real incident.`,
        is_synthetic: true,
        created_at: new Date().toISOString()
      });
    }

    // 5. Generate Simulated Shortage & Overcapacity Alerts
    const shortageAlerts = [];

    if (icuShortage > 0) {
      shortageAlerts.push({
        id: `sim-alert-icu-shortage`,
        type: 'CRITICAL',
        title: '[SIMULATION] Critical ICU Bed Exhaustion',
        message: `Projected demand (${numIcu} ICU beds) exceeds total network available headroom (${beforeAvailIcu} beds) by ${icuShortage} units. Regional surge activation required.`,
        resource_type: 'ICU_BED',
        deficit: icuShortage,
        timestamp: new Date().toISOString()
      });
    }

    if (genShortage > 0) {
      shortageAlerts.push({
        id: `sim-alert-gen-shortage`,
        type: 'CRITICAL',
        title: '[SIMULATION] General Bed Shortage Alert',
        message: `Projected general bed deficit of ${genShortage} beds. Alternate field triage or overflow facilities will be necessary.`,
        resource_type: 'GENERAL_BED',
        deficit: genShortage,
        timestamp: new Date().toISOString()
      });
    }

    if (ventShortage > 0) {
      shortageAlerts.push({
        id: `sim-alert-vent-shortage`,
        type: 'CRITICAL',
        title: '[SIMULATION] Ventilator Depletion Alert',
        message: `Network ventilator reserves depleted. Projected deficit of ${ventShortage} ventilators under simulated crisis load.`,
        resource_type: 'VENTILATOR',
        deficit: ventShortage,
        timestamp: new Date().toISOString()
      });
    }

    if (bloodShortage > 0) {
      shortageAlerts.push({
        id: `sim-alert-blood-shortage`,
        type: 'CRITICAL',
        title: '[SIMULATION] Blood Bank Reserves Depleted',
        message: `Simulated transfusion demand exceeds network reserves by ${bloodShortage} units. Inter-regional blood courier mutual aid advised.`,
        resource_type: 'BLOOD',
        deficit: bloodShortage,
        timestamp: new Date().toISOString()
      });
    }

    // Alerts for hospitals transitioning to DIVERT
    affectedHospitals
      .filter(h => h.projected_status === 'DIVERT' && h.current_status !== 'DIVERT')
      .forEach(h => {
        shortageAlerts.push({
          id: `sim-alert-div-${h.id}`,
          type: 'CRITICAL',
          title: `[SIMULATION] Facility Pushed to DIVERT: ${h.name}`,
          message: `${h.name} (${h.trauma_level}) projected to enter DIVERT status under simulated load. Bed occupancy exceeds 95% or ICU capacity is zero.`,
          hospital_id: h.id,
          hospital_name: h.name,
          timestamp: new Date().toISOString()
        });
      });

    // Alerts for hospitals transitioning to SURGE
    affectedHospitals
      .filter(h => h.projected_status === 'SURGE' && h.current_status === 'NORMAL')
      .forEach(h => {
        shortageAlerts.push({
          id: `sim-alert-surge-${h.id}`,
          type: 'WARNING',
          title: `[SIMULATION] Facility Surge Alert: ${h.name}`,
          message: `${h.name} bed occupancy projected to rise from ${h.before_occupancy_rate}% to ${h.projected_occupancy_rate}%. Initiating internal surge protocols.`,
          hospital_id: h.id,
          hospital_name: h.name,
          timestamp: new Date().toISOString()
        });
      });

    const networkStress = Math.round((
      (beforeTotalIcu ? (numIcu / beforeTotalIcu) : 0) * 35 +
      (beforeTotalGen ? (numGen / beforeTotalGen) : 0) * 30 +
      (beforeTotalVent ? (numVent / beforeTotalVent) : 0) * 20 +
      (beforeTotalBlood ? (numBlood / beforeTotalBlood) : 0) * 15
    ));
    const scenarioSeverity = (icuShortage > 0 || genShortage > 0 || ventShortage > 0 || bloodShortage > 0) ? 'CRITICAL' :
      (afterBedOccupancy >= 90 || afterIcuUtil >= 90 || afterVentUtil >= 90) ? 'HIGH' :
      (afterBedOccupancy >= 75 || afterIcuUtil >= 75 || afterVentUtil >= 75) ? 'MODERATE' : 'LOW';

    return {
      is_simulation: true,
      mode: 'SYNTHETIC_SIMULATION',
      simulation_id: `sim-run-${Date.now().toString(36)}`,
      scenario_name: scenarioName,
      inputs: {
        cases_count: numCases,
        icu_demand: numIcu,
        general_bed_demand: numGen,
        ventilator_demand: numVent,
        blood_demand: numBlood,
        incident_category: incidentCategory,
        location
      },
      before: {
        timestamp: new Date().toISOString(),
        network_bed_occupancy_rate: beforeBedOccupancy,
        hospital_breakdown: beforeHospitalBreakdown,
        resources: {
          icu_beds: {
            total_capacity: beforeTotalIcu,
            available_quantity: beforeAvailIcu,
            occupied_quantity: beforeOccupiedIcu,
            reserved_quantity: beforeReservedIcu,
            utilization_rate: beforeIcuUtil
          },
          general_beds: {
            total_capacity: beforeTotalGen,
            available_quantity: beforeAvailGen,
            occupied_quantity: beforeOccupiedGen,
            reserved_quantity: beforeReservedGen,
            utilization_rate: beforeGenUtil
          },
          ventilators: {
            total_capacity: beforeTotalVent,
            available_quantity: beforeAvailVent,
            occupied_quantity: beforeOccupiedVent,
            reserved_quantity: beforeReservedVent,
            utilization_rate: beforeVentUtil
          },
          blood_units: {
            total_capacity: beforeTotalBlood,
            available_quantity: beforeAvailBlood
          },
          emergency_bays: {
            total_capacity: beforeTotalBays,
            available_quantity: beforeAvailBays
          }
        }
      },
      after: {
        timestamp: new Date().toISOString(),
        projected_bed_occupancy_rate: afterBedOccupancy,
        hospital_breakdown: afterHospitalBreakdown,
        resources: {
          icu_beds: {
            total_capacity: beforeTotalIcu,
            available_quantity: afterAvailIcu,
            projected_shortage: icuShortage,
            utilization_rate: afterIcuUtil
          },
          general_beds: {
            total_capacity: beforeTotalGen,
            available_quantity: afterAvailGen,
            projected_shortage: genShortage,
            utilization_rate: afterGenUtil
          },
          ventilators: {
            total_capacity: beforeTotalVent,
            available_quantity: afterAvailVent,
            projected_shortage: ventShortage,
            utilization_rate: afterVentUtil
          },
          blood_units: {
            total_capacity: beforeTotalBlood,
            available_quantity: afterAvailBlood,
            projected_shortage: bloodShortage
          }
        }
      },
      what_if: {
        scenario_severity: scenarioSeverity,
        network_stress_index: Math.min(100, networkStress),
        additional_icu_needed: icuShortage,
        additional_general_beds_needed: genShortage,
        additional_ventilators_needed: ventShortage,
        additional_blood_units_needed: bloodShortage,
        recommended_action: scenarioSeverity === 'CRITICAL' ? 'Activate mutual-aid / diversion plan and redistribute available resources.' : scenarioSeverity === 'HIGH' ? 'Prepare surge capacity and monitor resource thresholds closely.' : 'Current network headroom is sufficient for this modeled demand.'
      },
      projected_shortages: {
        has_shortages: (icuShortage > 0 || genShortage > 0 || ventShortage > 0 || bloodShortage > 0),
        icu_beds_deficit: icuShortage,
        general_beds_deficit: genShortage,
        ventilators_deficit: ventShortage,
        blood_units_deficit: bloodShortage,
        total_deficits_count: (icuShortage > 0 ? 1 : 0) + (genShortage > 0 ? 1 : 0) + (ventShortage > 0 ? 1 : 0) + (bloodShortage > 0 ? 1 : 0)
      },
      affected_hospitals: affectedHospitals,
      simulated_requests: simulatedRequests,
      shortage_alerts: shortageAlerts,
      disclaimer: 'SYNTHETIC SCENARIO SIMULATION ONLY: This projection is generated purely for stress-testing and operational coordination planning. No live patient records or clinical determinations are included.'
    };
  }

  /**
   * Explicitly Apply Simulated Scenario to PostgreSQL Database
   * Instantiates real emergency requests and resource holds marked with is_synthetic = TRUE.
   */
  async applySimulation(simulationData, user) {
    const {
      simulated_requests = [],
      scenario_name = 'Applied Emergency Scenario',
      simulation_id
    } = simulationData;

    if (!Array.isArray(simulated_requests) || simulated_requests.length === 0) {
      const err = new Error('simulated_requests array is required to apply simulation.');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      logger.info(`Applying synthetic simulation '${scenario_name}' (${simulated_requests.length} requests)...`);

      let createdRequestsCount = 0;
      let createdReservationsCount = 0;
      const createdRequestIds = [];

      for (const req of simulated_requests) {
        const requestId = req.id || `sim-req-${crypto.randomBytes(6).toString('hex')}`;
        const trackingCode = req.tracking_code || `SIM-REQ-${Date.now().toString(36).toUpperCase()}-${createdRequestsCount + 1}`;
        const priority = req.priority || 'MEDIUM';
        const incidentCategory = req.incident_category || 'MASS_CASUALTY';
        const patientRef = req.patient_reference || `SIM-PT-${createdRequestsCount + 1}`;
        const address = req.incident_address || 'Metropolis Simulated Incident';
        const lat = Number(req.incident_latitude) || 40.7128;
        const lng = Number(req.incident_longitude) || -74.0060;
        const assignedHospId = req.assigned_hospital_id || null;
        const notes = `[SYNTHETIC SIMULATION] Applied from Scenario Simulator (${scenario_name})`;

        // 1. Insert into emergency_requests
        await client.query(`
          INSERT INTO emergency_requests (
            id, tracking_code, priority, incident_category, patient_reference,
            requester_name, requester_contact, incident_latitude, incident_longitude,
            incident_address, status, assigned_hospital_id, notes, is_synthetic,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP);
        `, [
          requestId,
          trackingCode,
          priority,
          incidentCategory,
          patientRef,
          'Simulation Dispatch Controller',
          '555-SIM-SYS',
          lat,
          lng,
          address,
          ['SEARCHING','MATCH_FOUND','PENDING_ACCEPTANCE','ACCEPTED','RESERVED','ALLOCATED','COMPLETED','CANCELLED','PENDING','MATCHED','DISPATCHED','EN_ROUTE'].includes(req.status) ? req.status : 'SEARCHING',
          assignedHospId,
          notes,
          true
        ]);

        createdRequestsCount++;
        createdRequestIds.push(requestId);

        // 2. Insert demanded resources
        const demandedResources = req.demanded_resources || [];
        for (const dr of demandedResources) {
          const rrId = `sim-rr-${crypto.randomBytes(6).toString('hex')}`;
          const rType = dr.resource_type;
          const reqQty = Number(dr.required_quantity || 1);

          await client.query(`
            INSERT INTO request_resources (
              id, emergency_request_id, resource_type, required_quantity,
              fulfilled_quantity, status
            ) VALUES ($1, $2, $3, $4, $5, $6);
          `, [
            rrId,
            requestId,
            rType,
            reqQty,
            0,
            'UNFULFILLED'
          ]);

          // 3. Attempt reservation for demanded resource
          let resRow = null;
          let targetHospId = assignedHospId;

          // Try assigned hospital first
          if (targetHospId) {
            const assignedResCheck = await client.query(`
              SELECT id, hospital_id, total_capacity, occupied_quantity, reserved_quantity, available_quantity
              FROM resources
              WHERE hospital_id = $1 AND resource_type = $2
              FOR UPDATE;
            `, [targetHospId, rType]);

            if (assignedResCheck.rows.length > 0 && Number(assignedResCheck.rows[0].available_quantity || 0) > 0) {
              resRow = assignedResCheck.rows[0];
            }
          }

          // If assigned hospital has no available units for this resource, fallback to any operational hospital with stock
          if (!resRow) {
            const fallbackResCheck = await client.query(`
              SELECT r.id, r.hospital_id, r.total_capacity, r.occupied_quantity, r.reserved_quantity, r.available_quantity
              FROM resources r
              JOIN hospitals h ON r.hospital_id = h.id
              WHERE r.resource_type = $1 AND r.available_quantity > 0 AND h.status NOT IN ('OFFLINE', 'CLOSED')
              ORDER BY r.available_quantity DESC
              LIMIT 1
              FOR UPDATE;
            `, [rType]);

            if (fallbackResCheck.rows.length > 0) {
              resRow = fallbackResCheck.rows[0];
              targetHospId = resRow.hospital_id;
            }
          }

          if (resRow && Number(resRow.available_quantity || 0) > 0) {
            const availableUnits = Number(resRow.available_quantity || 0);
            const reserveQty = Math.min(availableUnits, reqQty);
            const resvId = `sim-resv-${crypto.randomBytes(6).toString('hex')}`;
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour hold

            // Create reservation
            await client.query(`
              INSERT INTO reservations (
                id, emergency_request_id, hospital_id, resource_id,
                reserved_quantity, status, reserved_at, expires_at,
                notes, is_synthetic, created_by_user_id
              ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, $10);
            `, [
              resvId,
              requestId,
              targetHospId,
              resRow.id,
              reserveQty,
              'HELD',
              expiresAt,
              `[SYNTHETIC SIMULATION] Scenario hold for ${rType}`,
              true,
              user?.id || null
            ]);

            // Increment reserved_quantity (PostgreSQL stored generated column handles available_quantity)
            await client.query(`
              UPDATE resources
              SET reserved_quantity = reserved_quantity + $1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $2;
            `, [reserveQty, resRow.id]);

            // Record in reservation_history
            await client.query(`
              INSERT INTO reservation_history (
                reservation_id, emergency_request_id, hospital_id,
                resource_id, action, quantity, user_id, notes, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP);
            `, [
              resvId,
              requestId,
              targetHospId,
              resRow.id,
              'RESERVED',
              reserveQty,
              user?.id || null,
              `[SYNTHETIC SIMULATION] Hold placed by scenario simulation`
            ]);

            // Update request_resources fulfillment
            await client.query(`
              UPDATE request_resources
              SET fulfilled_quantity = $1,
                  status = 'RESERVED'
              WHERE id = $2;
            `, [reserveQty, rrId]);

            createdReservationsCount++;
          }
        }

        // Log timeline history for the emergency request
        await client.query(`
          INSERT INTO emergency_status_history (
            emergency_request_id, previous_status, new_status, notes, changed_by_user_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
        `, [
          requestId,
          null,
          ['SEARCHING','MATCH_FOUND','PENDING_ACCEPTANCE','ACCEPTED','RESERVED','ALLOCATED','COMPLETED','CANCELLED','PENDING','MATCHED','DISPATCHED','EN_ROUTE'].includes(req.status) ? req.status : 'SEARCHING',
          `[SYNTHETIC SIMULATION] Incident created from scenario simulation '${scenario_name}'`,
          user?.id || null
        ]);
      }

      await client.query('COMMIT');
      logger.info(`Successfully applied simulation: ${createdRequestsCount} requests created, ${createdReservationsCount} resource holds placed.`);

      return {
        applied: true,
        is_simulation: true,
        scenario_name: scenario_name,
        simulation_id: simulation_id || `sim-applied-${Date.now().toString(36)}`,
        emergency_requests_created: createdRequestsCount,
        reservations_created: createdReservationsCount,
        created_request_ids: createdRequestIds,
        applied_at: new Date().toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to apply simulation transaction:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback / Clean Up Applied Synthetic Simulations
   * Releases all synthetic reservation holds and marks synthetic emergency requests as CANCELLED.
   */
  async cleanupSimulation(user) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      logger.info('Starting rollback / cleanup of all synthetic simulations...');

      // 1. Find all active synthetic reservations
      const resvRes = await client.query(`
        SELECT id, emergency_request_id, hospital_id, resource_id, reserved_quantity
        FROM reservations
        WHERE is_synthetic = TRUE AND status = 'HELD'
        FOR UPDATE;
      `);

      let releasedReservationsCount = 0;

      for (const resv of resvRes.rows) {
        // Decrease reserved quantity
        await client.query(`
          UPDATE resources
          SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `, [Number(resv.reserved_quantity), resv.resource_id]);

        // Cancel reservation
        await client.query(`
          UPDATE reservations
          SET status = 'CANCELLED',
              released_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [resv.id]);

        // Record cancellation in history
        await client.query(`
          INSERT INTO reservation_history (
            reservation_id, emergency_request_id, hospital_id,
            resource_id, action, quantity, user_id, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP);
        `, [
          resv.id,
          resv.emergency_request_id,
          resv.hospital_id,
          resv.resource_id,
          'CANCELLED',
          Number(resv.reserved_quantity),
          user?.id || null,
          '[SYNTHETIC SIMULATION] Cleaned up from Scenario Simulator'
        ]);

        releasedReservationsCount++;
      }

      // 2. Cancel all synthetic emergency requests that are not yet terminal
      const emgUpdateRes = await client.query(`
        UPDATE emergency_requests
        SET status = 'CANCELLED',
            resolved_at = CURRENT_TIMESTAMP
        WHERE is_synthetic = TRUE AND status NOT IN ('COMPLETED', 'CANCELLED')
        RETURNING id;
      `);

      const cancelledRequestsCount = emgUpdateRes.rows.length;

      // Log status history for cancelled requests
      for (const r of emgUpdateRes.rows) {
        await client.query(`
          INSERT INTO emergency_status_history (
            emergency_request_id, previous_status, new_status, notes, changed_by_user_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
        `, [
          r.id,
          'ACTIVE',
          'CANCELLED',
          '[SYNTHETIC SIMULATION] Cancelled via Scenario Simulator cleanup',
          user?.id || null
        ]);
      }

      await client.query('COMMIT');
      logger.info(`Simulation cleanup finished: ${releasedReservationsCount} holds released, ${cancelledRequestsCount} requests cancelled.`);

      return {
        cleaned_up: true,
        released_reservations_count: releasedReservationsCount,
        cancelled_requests_count: cancelledRequestsCount,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to clean up simulation:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new SimulationService();
