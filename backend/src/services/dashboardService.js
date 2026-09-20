const { query } = require('../db');
const { formatResourceLabel } = require('../utils/resourceHelper');

/**
 * Service for Coordinator Command Center Dashboard (Phase 6)
 * Queries live PostgreSQL database telemetry without hardcoding.
 */
class DashboardService {
  async getOverview() {
    // 1. Hospital counts and operational breakdown
    const hospQuery = `
      SELECT 
        COUNT(*) as total_hospitals,
        COUNT(*) FILTER (WHERE status != 'OFFLINE') as operational_hospitals,
        COUNT(*) FILTER (WHERE status = 'NORMAL') as count_normal,
        COUNT(*) FILTER (WHERE status = 'SURGE') as count_surge,
        COUNT(*) FILTER (WHERE status = 'DIVERT') as count_divert,
        COUNT(*) FILTER (WHERE status = 'OFFLINE') as count_offline
      FROM hospitals;
    `;
    const hospRes = await query(hospQuery);
    const hospRow = hospRes.rows[0];

    // 2. Resource aggregates across all categories
    const resQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN total_capacity ELSE 0 END), 0) as total_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN available_quantity ELSE 0 END), 0) as available_icu,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN total_capacity ELSE 0 END), 0) as total_gen,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN available_quantity ELSE 0 END), 0) as available_gen,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN total_capacity ELSE 0 END), 0) as total_vent,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN available_quantity ELSE 0 END), 0) as available_vent,
        COALESCE(SUM(CASE WHEN category IN ('CAPACITY', 'EMERGENCY_CAPACITY') THEN total_capacity ELSE 0 END), 0) as total_cap,
        COALESCE(SUM(CASE WHEN category IN ('CAPACITY', 'EMERGENCY_CAPACITY') THEN available_quantity ELSE 0 END), 0) as available_cap,
        COALESCE(SUM(CASE WHEN category = 'BLOOD' THEN available_quantity ELSE 0 END), 0) as total_blood_units,
        COALESCE(SUM(CASE WHEN category = 'BEDS' THEN total_capacity ELSE 0 END), 0) as total_all_beds,
        COALESCE(SUM(CASE WHEN category = 'BEDS' THEN available_quantity ELSE 0 END), 0) as available_all_beds,
        COALESCE(SUM(CASE WHEN category = 'BEDS' THEN occupied_quantity ELSE 0 END), 0) as occupied_all_beds
      FROM resources;
    `;
    const resSummaryRes = await query(resQuery);
    const resRow = resSummaryRes.rows[0];

    const totalIcu = parseInt(resRow.total_icu, 10);
    const availIcu = parseInt(resRow.available_icu, 10);
    const icuUtil = totalIcu > 0 ? Math.round(((totalIcu - availIcu) / totalIcu) * 100) : 0;

    const totalGen = parseInt(resRow.total_gen, 10);
    const availGen = parseInt(resRow.available_gen, 10);
    const genUtil = totalGen > 0 ? Math.round(((totalGen - availGen) / totalGen) * 100) : 0;

    const totalVent = parseInt(resRow.total_vent, 10);
    const availVent = parseInt(resRow.available_vent, 10);
    const ventUtil = totalVent > 0 ? Math.round(((totalVent - availVent) / totalVent) * 100) : 0;

    const totalCap = parseInt(resRow.total_cap, 10);
    const availCap = parseInt(resRow.available_cap, 10);
    const capUtil = totalCap > 0 ? Math.round(((totalCap - availCap) / totalCap) * 100) : 0;

    const totalAllBeds = parseInt(resRow.total_all_beds, 10);
    const availAllBeds = parseInt(resRow.available_all_beds, 10);
    const overallBedUtil = totalAllBeds > 0 ? Math.round(((totalAllBeds - availAllBeds) / totalAllBeds) * 100) : 0;

    // 3. Blood groups below threshold
    const bloodQuery = `
      SELECT 
        r.id,
        r.hospital_id,
        h.name as hospital_name,
        h.city as hospital_city,
        r.resource_type,
        r.available_quantity,
        r.critical_threshold as threshold,
        (r.critical_threshold - r.available_quantity) as deficit,
        r.unit_of_measure,
        r.status,
        r.updated_at as last_updated
      FROM resources r
      JOIN hospitals h ON r.hospital_id = h.id
      WHERE r.category = 'BLOOD' AND r.available_quantity <= r.critical_threshold
      ORDER BY r.available_quantity ASC;
    `;
    const bloodRes = await query(bloodQuery);
    const bloodBelowThreshold = bloodRes.rows.map(b => ({
      ...b,
      resource_label: formatResourceLabel(b.resource_type)
    }));

    // 4. Active emergency requests
    const emgQuery = `
      SELECT 
        er.id,
        er.tracking_code,
        er.priority,
        er.incident_category,
        er.patient_reference,
        er.requester_name,
        er.requester_contact,
        er.incident_address,
        er.status,
        er.created_at,
        er.notes,
        er.assigned_hospital_id,
        h.name as assigned_hospital_name,
        h.city as assigned_hospital_city
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.assigned_hospital_id = h.id
      WHERE er.status NOT IN ('COMPLETED', 'CANCELLED')
      ORDER BY 
        CASE er.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        er.created_at DESC;
    `;
    const emgRes = await query(emgQuery);
    const activeEmergencies = emgRes.rows;

    // 5. Hospital status and live telemetry per facility
    const hospDetailQuery = `
      SELECT 
        h.id,
        h.name,
        h.code,
        h.city,
        h.tier,
        h.trauma_level,
        h.status,
        h.address,
        h.contact_phone as phone,
        h.contact_email as email,
        h.latitude,
        h.longitude,
        COALESCE(SUM(CASE WHEN r.resource_type = 'ICU_BED' THEN r.total_capacity ELSE 0 END), 0) as total_icu,
        COALESCE(SUM(CASE WHEN r.resource_type = 'ICU_BED' THEN r.available_quantity ELSE 0 END), 0) as available_icu,
        COALESCE(SUM(CASE WHEN r.resource_type = 'GENERAL_BED' THEN r.total_capacity ELSE 0 END), 0) as total_gen,
        COALESCE(SUM(CASE WHEN r.resource_type = 'GENERAL_BED' THEN r.available_quantity ELSE 0 END), 0) as available_gen,
        COALESCE(SUM(CASE WHEN r.category = 'BLOOD' THEN r.available_quantity ELSE 0 END), 0) as total_blood,
        COALESCE(SUM(CASE WHEN r.resource_type = 'VENTILATOR' THEN r.available_quantity ELSE 0 END), 0) as available_vent,
        COALESCE(SUM(CASE WHEN r.category IN ('CAPACITY', 'EMERGENCY_CAPACITY') THEN r.available_quantity ELSE 0 END), 0) as available_bays,
        COALESCE(SUM(CASE WHEN r.category IN ('CAPACITY', 'EMERGENCY_CAPACITY') THEN r.total_capacity ELSE 0 END), 0) as total_bays
      FROM hospitals h
      LEFT JOIN resources r ON h.id = r.hospital_id
      GROUP BY h.id
      ORDER BY 
        CASE h.status 
          WHEN 'DIVERT' THEN 1 
          WHEN 'SURGE' THEN 2 
          WHEN 'NORMAL' THEN 3 
          ELSE 4 
        END,
        h.name ASC;
    `;
    const hospDetailRes = await query(hospDetailQuery);
    const hospitalStatusList = hospDetailRes.rows.map(h => {
      const totBeds = parseInt(h.total_icu, 10) + parseInt(h.total_gen, 10);
      const availBeds = parseInt(h.available_icu, 10) + parseInt(h.available_gen, 10);
      const occupancyRate = totBeds > 0 ? Math.round(((totBeds - availBeds) / totBeds) * 100) : 0;
      return {
        ...h,
        total_beds: totBeds,
        available_beds: availBeds,
        occupancy_rate: occupancyRate
      };
    });

    // 6. Dynamic Critical Alerts Synthesis
    const alerts = [];

    // Alert for Divert Hospitals
    hospitalStatusList
      .filter(h => h.status === 'DIVERT')
      .forEach(h => {
        alerts.push({
          id: `alert-div-${h.id}`,
          type: 'CRITICAL',
          title: `Facility On Divert: ${h.name}`,
          message: `${h.name} (${h.trauma_level}) is currently on DIVERT status. Bed occupancy at ${h.occupancy_rate}%. Divert incoming trauma transport.`,
          hospital_id: h.id,
          hospital_name: h.name,
          timestamp: new Date().toISOString()
        });
      });

    // Alert for Surge Hospitals
    hospitalStatusList
      .filter(h => h.status === 'SURGE')
      .forEach(h => {
        alerts.push({
          id: `alert-surge-${h.id}`,
          type: 'WARNING',
          title: `Surge Capacity Alert: ${h.name}`,
          message: `${h.name} operating at elevated surge capacity. ${h.available_icu} ICU beds remaining.`,
          hospital_id: h.id,
          hospital_name: h.name,
          timestamp: new Date().toISOString()
        });
      });

    // Alert for Blood Deficits
    bloodBelowThreshold.forEach(b => {
      alerts.push({
        id: `alert-blood-${b.id}`,
        type: b.available_quantity === 0 ? 'CRITICAL' : 'WARNING',
        title: `Blood Depository Shortage: ${b.resource_label}`,
        message: `${b.hospital_name} has critical shortage of ${b.resource_label} (${b.available_quantity} units available, threshold is ${b.threshold}).`,
        hospital_id: b.hospital_id,
        hospital_name: b.hospital_name,
        timestamp: b.last_updated
      });
    });

    // Alert for Critical Pending Emergencies
    activeEmergencies
      .filter(e => e.priority === 'CRITICAL' && (!e.assigned_hospital_id || e.status === 'PENDING'))
      .forEach(e => {
        alerts.push({
          id: `alert-emg-${e.id}`,
          type: 'CRITICAL',
          title: `Unassigned Critical Incident: ${e.tracking_code}`,
          message: `${e.incident_category} emergency at "${e.incident_address}" awaiting hospital dispatch match.`,
          emergency_id: e.id,
          timestamp: e.created_at
        });
      });

    return {
      timestamp: new Date().toISOString(),
      // Top Level required values
      total_hospitals: parseInt(hospRow.total_hospitals, 10),
      operational_hospitals: parseInt(hospRow.operational_hospitals, 10),
      available_icu_beds: availIcu,
      total_icu_beds: totalIcu,
      available_general_beds: availGen,
      total_general_beds: totalGen,
      emergency_capacity: {
        available: availCap,
        total: totalCap,
        utilization: capUtil
      },
      available_ventilators: availVent,
      total_ventilators: totalVent,
      blood_groups_below_threshold: bloodBelowThreshold,
      blood_deficit_count: bloodBelowThreshold.length,
      active_emergency_requests: {
        total_active: activeEmergencies.length,
        critical_count: activeEmergencies.filter(e => e.priority === 'CRITICAL').length,
        high_count: activeEmergencies.filter(e => e.priority === 'HIGH').length,
        list: activeEmergencies
      },
      hospital_status: {
        summary: {
          NORMAL: parseInt(hospRow.count_normal, 10),
          SURGE: parseInt(hospRow.count_surge, 10),
          DIVERT: parseInt(hospRow.count_divert, 10),
          OFFLINE: parseInt(hospRow.count_offline, 10)
        },
        hospitals: hospitalStatusList
      },
      resource_utilization: {
        overall_bed_utilization: overallBedUtil,
        icu_utilization: icuUtil,
        general_bed_utilization: genUtil,
        ventilator_utilization: ventUtil,
        emergency_capacity_utilization: capUtil,
        total_blood_units: parseInt(resRow.total_blood_units, 10),
        categories: {
          beds: { total: totalAllBeds, available: availAllBeds, utilization: overallBedUtil },
          icu: { total: totalIcu, available: availIcu, utilization: icuUtil },
          general: { total: totalGen, available: availGen, utilization: genUtil },
          ventilators: { total: totalVent, available: availVent, utilization: ventUtil },
          capacity: { total: totalCap, available: availCap, utilization: capUtil },
          blood: { available: parseInt(resRow.total_blood_units, 10) }
        }
      },
      critical_alerts: alerts
    };
  }
}

module.exports = new DashboardService();
