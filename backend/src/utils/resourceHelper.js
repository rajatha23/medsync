/**
 * Resource Calculation, Validation, and Normalization Helper for Phase 5
 */

/**
 * Automatically calculate resource status based on availability and threshold:
 * - AVAILABLE: available > threshold * 1.5 and > 30% of total
 * - LIMITED: available <= threshold * 1.5 or <= 30% of total
 * - CRITICAL: available <= threshold
 * - UNAVAILABLE: available <= 0
 * 
 * @param {number} available - Current available quantity
 * @param {number} total - Total capacity/quantity
 * @param {number} threshold - Critical minimum threshold
 * @returns {'AVAILABLE' | 'LIMITED' | 'CRITICAL' | 'UNAVAILABLE'}
 */
function calculateResourceStatus(available, total, threshold = 5) {
  const avail = Number(available);
  const tot = Number(total);
  const thresh = Number(threshold);

  if (isNaN(avail) || avail <= 0) {
    return 'UNAVAILABLE';
  }
  if (avail <= thresh) {
    return 'CRITICAL';
  }
  if (avail <= thresh * 1.5 || (tot > 0 && (avail / tot) <= 0.3)) {
    return 'LIMITED';
  }
  return 'AVAILABLE';
}

/**
 * Normalize category string to standard: BEDS, BLOOD, EQUIPMENT, CAPACITY
 */
function normalizeCategory(category) {
  if (!category) return 'BEDS';
  const cat = category.toUpperCase().trim();
  if (cat === 'BED' || cat === 'BEDS') return 'BEDS';
  if (cat === 'BLOOD') return 'BLOOD';
  if (cat === 'EQUIPMENT') return 'EQUIPMENT';
  if (cat === 'CAPACITY' || cat === 'EMERGENCY_CAPACITY') return 'CAPACITY';
  return cat;
}

/**
 * Validate resource quantities:
 * - available_quantity cannot be negative.
 * - available_quantity cannot exceed total_quantity.
 * - total_quantity cannot be negative.
 */
function validateQuantities(totalQuantity, availableQuantity) {
  const total = Number(totalQuantity);
  const available = Number(availableQuantity);

  if (isNaN(total) || total < 0) {
    const err = new Error('total_quantity must be a non-negative number.');
    err.statusCode = 400;
    throw err;
  }

  if (isNaN(available) || available < 0) {
    const err = new Error('available_quantity cannot be negative.');
    err.statusCode = 400;
    throw err;
  }

  if (available > total) {
    const err = new Error(`available_quantity (${available}) cannot exceed total_quantity (${total}).`);
    err.statusCode = 400;
    throw err;
  }

  return { total, available };
}

/**
 * Human friendly display labels for resource types
 */
const RESOURCE_TYPE_LABELS = {
  'ICU_BED': 'ICU Bed',
  'GENERAL_BED': 'General Bed',
  'EMERGENCY_BED': 'Emergency Bed',
  'PEDIATRIC_BED': 'Pediatric Bed',
  'BLOOD_A_POS': 'A+ Blood',
  'BLOOD_A_NEG': 'A- Blood',
  'BLOOD_B_POS': 'B+ Blood',
  'BLOOD_B_NEG': 'B- Blood',
  'BLOOD_AB_POS': 'AB+ Blood',
  'BLOOD_AB_NEG': 'AB- Blood',
  'BLOOD_O_POS': 'O+ Blood',
  'BLOOD_O_NEG': 'O- Blood',
  'VENTILATOR': 'Ventilator',
  'DIALYSIS_MACHINE': 'Dialysis Machine',
  'EMERGENCY_CAPACITY': 'Emergency Capacity',
  'AMBULANCE_BAY': 'Ambulance Bay',
  'RESUSCITATION_STATION': 'Resuscitation Station'
};

function formatResourceLabel(resourceType) {
  if (!resourceType) return '';
  return RESOURCE_TYPE_LABELS[resourceType] || resourceType.replace(/_/g, ' ');
}

module.exports = {
  calculateResourceStatus,
  normalizeCategory,
  validateQuantities,
  formatResourceLabel,
  RESOURCE_TYPE_LABELS
};
