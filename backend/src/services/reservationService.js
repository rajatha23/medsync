const { pool, query } = require('../db');
const crypto = require('crypto');

/**
 * Service for Resource Reservation Workflow (Phase 9)
 * Manages ACID transactions, row-level concurrency locks (FOR UPDATE),
 * non-negative inventory invariants, cancellation/release, and audit history.
 */
class ReservationService {
  /**
   * Reserve a specific resource for an emergency request
   * Guaranteed concurrency safety via PostgreSQL row-level locks.
   */
  async createReservation(params, user) {
    const {
      emergency_request_id,
      hospital_id,
      resource_id,
      quantity = 1,
      expires_in_minutes = 30,
      notes = ''
    } = params;

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      const err = new Error('Reservation quantity must be a positive integer.');
      err.statusCode = 400;
      throw err;
    }

    if (!emergency_request_id || !resource_id) {
      const err = new Error('emergency_request_id and resource_id are required.');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock emergency request row
      const reqRes = await client.query(
        'SELECT id, tracking_code, priority, status, assigned_hospital_id FROM emergency_requests WHERE id = $1 FOR UPDATE',
        [emergency_request_id]
      );

      if (reqRes.rows.length === 0) {
        const err = new Error(`Emergency request '${emergency_request_id}' not found.`);
        err.statusCode = 404;
        throw err;
      }
      const emergency = reqRes.rows[0];

      if (emergency.status === 'COMPLETED' || emergency.status === 'CANCELLED') {
        const err = new Error(`Cannot reserve resources for terminal emergency request status '${emergency.status}'.`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Lock target resource row using FOR UPDATE to serialize concurrent reservation attempts
      const resLock = await client.query(
        `SELECT 
           id, hospital_id, department_id, category, resource_type,
           total_capacity, occupied_quantity, reserved_quantity,
           available_quantity, status
         FROM resources
         WHERE id = $1
         FOR UPDATE;`,
        [resource_id]
      );

      if (resLock.rows.length === 0) {
        const err = new Error(`Resource with ID '${resource_id}' not found.`);
        err.statusCode = 404;
        throw err;
      }
      const resRow = resLock.rows[0];

      // 3. Strict Available Headroom Check
      // resRow.available_quantity is computed as total_capacity - occupied_quantity - reserved_quantity
      if (resRow.available_quantity < numQty) {
        const err = new Error(
          `Insufficient available capacity for ${resRow.resource_type}. Requested: ${numQty}, Available: ${resRow.available_quantity}.`
        );
        err.statusCode = 409; // HTTP 409 Conflict
        throw err;
      }

      // Check if reservation would exceed total capacity
      if (resRow.occupied_quantity + resRow.reserved_quantity + numQty > resRow.total_capacity) {
        const err = new Error(
          `Reservation exceeds total capacity (${resRow.total_capacity}). Requested: ${numQty}, Current held: ${resRow.reserved_quantity}.`
        );
        err.statusCode = 409;
        throw err;
      }

      // 4. Update the resource row: increment reserved_quantity
      // In PostgreSQL, available_quantity is automatically decreased because it is a STORED generated column
      const updateRes = await client.query(
        `UPDATE resources
         SET reserved_quantity = reserved_quantity + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *;`,
        [numQty, resource_id]
      );
      const updatedResource = updateRes.rows[0];

      // Double-check invariant that available_quantity is never negative
      if (updatedResource.available_quantity < 0) {
        throw new Error('Database invariant violation: available_quantity cannot be negative.');
      }

      // 5. Insert reservation record
      const reservationId = `resv-${crypto.randomBytes(6).toString('hex')}`;
      const expiresAt = new Date(Date.now() + expires_in_minutes * 60 * 1000);
      const finalHospitalId = hospital_id || resRow.hospital_id;

      const insertResv = await client.query(
        `INSERT INTO reservations (
           id, emergency_request_id, hospital_id, resource_id,
           reserved_quantity, status, reserved_at, expires_at,
           notes, created_by_user_id
         )
         VALUES ($1, $2, $3, $4, $5, 'HELD', CURRENT_TIMESTAMP, $6, $7, $8)
         RETURNING *;`,
        [
          reservationId,
          emergency_request_id,
          finalHospitalId,
          resource_id,
          numQty,
          expiresAt,
          notes,
          user?.id || null
        ]
      );
      const createdReservation = insertResv.rows[0];

      // 6. Insert into immutable reservation_history audit ledger
      await client.query(
        `INSERT INTO reservation_history (
           reservation_id, emergency_request_id, hospital_id, resource_id,
           action, quantity, user_id, notes
         )
         VALUES ($1, $2, $3, $4, 'RESERVED', $5, $6, $7);`,
        [
          reservationId,
          emergency_request_id,
          finalHospitalId,
          resource_id,
          numQty,
          user?.id || null,
          notes || `Reserved ${numQty} ${resRow.resource_type}`
        ]
      );

      // 7. Update request_resources fulfilled_quantity
      await client.query(
        `UPDATE request_resources
         SET fulfilled_quantity = LEAST(required_quantity, fulfilled_quantity + $1),
             status = CASE 
               WHEN fulfilled_quantity + $1 >= required_quantity THEN 'RESERVED'
               ELSE 'UNFULFILLED'
             END
         WHERE emergency_request_id = $2 AND resource_type = $3;`,
        [numQty, emergency_request_id, resRow.resource_type]
      );

      // 8. Update emergency request status to RESERVED if not already further in lifecycle
      await client.query(
        `UPDATE emergency_requests
         SET status = CASE 
               WHEN status IN ('SEARCHING', 'MATCH_FOUND', 'PENDING_ACCEPTANCE', 'ACCEPTED') THEN 'RESERVED'
               ELSE status 
             END,
             assigned_hospital_id = COALESCE(assigned_hospital_id, $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [finalHospitalId, emergency_request_id]
      );

      // 9. Record status history audit
      await client.query(
        `INSERT INTO emergency_status_history (
           emergency_request_id, previous_status, new_status, notes, changed_by_user_id
         )
         VALUES ($1, $2, 'RESERVED', $3, $4);`,
        [
          emergency_request_id,
          emergency.status,
          `Reserved ${numQty} ${resRow.resource_type} at facility ${finalHospitalId}`,
          user?.id || null
        ]
      );

      await client.query('COMMIT');

      return {
        reservation: createdReservation,
        resource: {
          id: updatedResource.id,
          resource_type: updatedResource.resource_type,
          total_capacity: updatedResource.total_capacity,
          occupied_quantity: updatedResource.occupied_quantity,
          reserved_quantity: updatedResource.reserved_quantity,
          available_quantity: updatedResource.available_quantity
        },
        emergency_request_id
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk reserve all demanded resources at a matched hospital for an emergency request
   */
  async reserveAllDemandedForHospital(params, user) {
    const {
      emergency_request_id,
      hospital_id,
      expires_in_minutes = 30,
      notes = ''
    } = params;

    if (!emergency_request_id || !hospital_id) {
      const err = new Error('emergency_request_id and hospital_id are required.');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock emergency request row
      const reqRes = await client.query(
        'SELECT id, tracking_code, priority, status, assigned_hospital_id FROM emergency_requests WHERE id = $1 FOR UPDATE',
        [emergency_request_id]
      );

      if (reqRes.rows.length === 0) {
        const err = new Error(`Emergency request '${emergency_request_id}' not found.`);
        err.statusCode = 404;
        throw err;
      }
      const emergency = reqRes.rows[0];

      // 2. Fetch required resources for this emergency request
      const rrRes = await client.query(
        'SELECT id, resource_type, required_quantity, fulfilled_quantity FROM request_resources WHERE emergency_request_id = $1 ORDER BY resource_type ASC',
        [emergency_request_id]
      );

      if (rrRes.rows.length === 0) {
        const err = new Error('No required resources specified for this emergency request.');
        err.statusCode = 400;
        throw err;
      }

      const createdReservations = [];
      const updatedResources = [];

      // Sort resources deterministically to avoid deadlocks across multiple concurrent transactions
      const demandedItems = rrRes.rows;

      for (const demand of demandedItems) {
        const neededQty = demand.required_quantity - demand.fulfilled_quantity;
        if (neededQty <= 0) continue; // Already satisfied

        // Find and lock candidate resource at this hospital
        const resLock = await client.query(
          `SELECT 
             id, hospital_id, category, resource_type,
             total_capacity, occupied_quantity, reserved_quantity,
             available_quantity
           FROM resources
           WHERE hospital_id = $1 AND (
             resource_type = $2 OR
             ($2 = 'GENERAL_BED' AND category = 'BED' AND resource_type = 'GENERAL_BED') OR
             ($2 = 'EMERGENCY_BED' AND (category = 'EMERGENCY_CAPACITY' OR resource_type = 'AMBULANCE_BAY'))
           )
           FOR UPDATE;`,
          [hospital_id, demand.resource_type]
        );

        if (resLock.rows.length === 0) {
          const err = new Error(`Hospital does not carry resource '${demand.resource_type}'.`);
          err.statusCode = 409;
          throw err;
        }

        const resRow = resLock.rows[0];

        if (resRow.available_quantity < neededQty) {
          const err = new Error(
            `Insufficient available resources at this hospital for ${demand.resource_type}. Needed: ${neededQty}, Available: ${resRow.available_quantity}.`
          );
          err.statusCode = 409;
          throw err;
        }

        // Increment reserved_quantity
        const upRes = await client.query(
          `UPDATE resources
           SET reserved_quantity = reserved_quantity + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *;`,
          [neededQty, resRow.id]
        );
        const updatedRes = upRes.rows[0];
        updatedResources.push(updatedRes);

        // Insert reservation
        const reservationId = `resv-${crypto.randomBytes(6).toString('hex')}`;
        const expiresAt = new Date(Date.now() + expires_in_minutes * 60 * 1000);

        const insResv = await client.query(
          `INSERT INTO reservations (
             id, emergency_request_id, hospital_id, resource_id,
             reserved_quantity, status, reserved_at, expires_at,
             notes, created_by_user_id
           )
           VALUES ($1, $2, $3, $4, $5, 'HELD', CURRENT_TIMESTAMP, $6, $7, $8)
           RETURNING *;`,
          [
            reservationId,
            emergency_request_id,
            hospital_id,
            resRow.id,
            neededQty,
            expiresAt,
            notes,
            user?.id || null
          ]
        );
        createdReservations.push(insResv.rows[0]);

        // Insert reservation history
        await client.query(
          `INSERT INTO reservation_history (
             reservation_id, emergency_request_id, hospital_id, resource_id,
             action, quantity, user_id, notes
           )
           VALUES ($1, $2, $3, $4, 'RESERVED', $5, $6, $7);`,
          [
            reservationId,
            emergency_request_id,
            hospital_id,
            resRow.id,
            neededQty,
            user?.id || null,
            notes || `Reserved ${neededQty} ${resRow.resource_type}`
          ]
        );

        // Update request_resources
        await client.query(
          `UPDATE request_resources
           SET fulfilled_quantity = fulfilled_quantity + $1,
               status = 'RESERVED'
           WHERE id = $2;`,
          [neededQty, demand.id]
        );
      }

      // Update emergency request status to RESERVED and assign hospital
      await client.query(
        `UPDATE emergency_requests
         SET status = 'RESERVED',
             assigned_hospital_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [hospital_id, emergency_request_id]
      );

      // Status history
      await client.query(
        `INSERT INTO emergency_status_history (
           emergency_request_id, previous_status, new_status, notes, changed_by_user_id
         )
         VALUES ($1, $2, 'RESERVED', $3, $4);`,
        [
          emergency_request_id,
          emergency.status,
          `All demanded resources reserved at hospital ${hospital_id}`,
          user?.id || null
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        reservations_count: createdReservations.length,
        reservations: createdReservations,
        resources: updatedResources
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Release or cancel a specific reservation
   */
  async releaseReservation(reservationId, options = {}, user) {
    const { reason = 'Reservation released / cancelled', releaseStatus = 'RELEASED' } = options;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Lock reservation row
      const resvLock = await client.query(
        'SELECT * FROM reservations WHERE id = $1 FOR UPDATE;',
        [reservationId]
      );

      if (resvLock.rows.length === 0) {
        const err = new Error(`Reservation with ID '${reservationId}' not found.`);
        err.statusCode = 404;
        throw err;
      }
      const resv = resvLock.rows[0];

      if (resv.status === 'RELEASED' || resv.status === 'CANCELLED' || resv.status === 'EXPIRED') {
        const err = new Error(`Reservation is already in inactive state '${resv.status}'.`);
        err.statusCode = 400;
        throw err;
      }

      // Lock resource row
      const resLock = await client.query(
        'SELECT * FROM resources WHERE id = $1 FOR UPDATE;',
        [resv.resource_id]
      );
      const resRow = resLock.rows[0];

      // Decrease reserved_quantity in resources
      const upRes = await client.query(
        `UPDATE resources
         SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *;`,
        [resv.reserved_quantity, resv.resource_id]
      );
      const updatedResource = upRes.rows[0];

      // Update reservation status to RELEASED or CANCELLED
      const upResv = await client.query(
        `UPDATE reservations
         SET status = $1,
             released_at = CURRENT_TIMESTAMP,
             notes = CASE WHEN $2::text IS NOT NULL THEN CONCAT(COALESCE(notes, ''), ' | Released: ', $2::text) ELSE notes END
         WHERE id = $3
         RETURNING *;`,
        [releaseStatus, reason, reservationId]
      );
      const updatedReservation = upResv.rows[0];

      // Log in reservation_history ledger
      await client.query(
        `INSERT INTO reservation_history (
           reservation_id, emergency_request_id, hospital_id, resource_id,
           action, quantity, user_id, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          reservationId,
          resv.emergency_request_id,
          resv.hospital_id,
          resv.resource_id,
          releaseStatus === 'CANCELLED' ? 'CANCELLED' : 'RELEASED',
          resv.reserved_quantity,
          user?.id || null,
          reason
        ]
      );

      // Decrease request_resources fulfilled_quantity
      if (resRow) {
        await client.query(
          `UPDATE request_resources
           SET fulfilled_quantity = GREATEST(0, fulfilled_quantity - $1),
               status = 'UNFULFILLED'
           WHERE emergency_request_id = $2 AND resource_type = $3;`,
          [resv.reserved_quantity, resv.emergency_request_id, resRow.resource_type]
        );
      }

      // Check if any other active reservations remain for this emergency request
      const remainingActive = await client.query(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE emergency_request_id = $1 AND status IN ('HELD', 'CONFIRMED');`,
        [resv.emergency_request_id]
      );

      if (parseInt(remainingActive.rows[0].count, 10) === 0) {
        // If all reservations released, revert emergency request status to ACCEPTED or MATCH_FOUND
        await client.query(
          `UPDATE emergency_requests
           SET status = CASE 
                 WHEN status = 'RESERVED' THEN 'ACCEPTED'
                 ELSE status 
               END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1;`,
          [resv.emergency_request_id]
        );
      }

      await client.query('COMMIT');

      return {
        reservation: updatedReservation,
        resource: {
          id: updatedResource.id,
          available_quantity: updatedResource.available_quantity,
          reserved_quantity: updatedResource.reserved_quantity
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Release all active reservations for an emergency request
   */
  async releaseAllReservationsForRequest(emergencyRequestId, reason = 'All reservations released', user) {
    const activeResvs = await query(
      `SELECT id FROM reservations 
       WHERE emergency_request_id = $1 AND status IN ('HELD', 'CONFIRMED');`,
      [emergencyRequestId]
    );

    const released = [];
    for (const r of activeResvs.rows) {
      const res = await this.releaseReservation(r.id, { reason, releaseStatus: 'RELEASED' }, user);
      released.push(res);
    }

    return {
      released_count: released.length,
      released
    };
  }

  /**
   * Get all reservations for an emergency request
   */
  async getReservationsForRequest(emergencyRequestId) {
    const res = await query(
      `SELECT 
         r.id,
         r.emergency_request_id,
         r.hospital_id,
         h.name AS hospital_name,
         h.city AS hospital_city,
         r.resource_id,
         res.resource_type,
         res.category,
         r.reserved_quantity,
         r.status,
         r.reserved_at,
         r.expires_at,
         r.released_at,
         r.notes,
         u.name AS created_by_name
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.id
       JOIN resources res ON r.resource_id = res.id
       LEFT JOIN users u ON r.created_by_user_id = u.id
       WHERE r.emergency_request_id = $1
       ORDER BY r.reserved_at DESC;`,
      [emergencyRequestId]
    );

    return res.rows;
  }

  /**
   * Get full reservation history ledger for an emergency request
   */
  async getReservationHistory(emergencyRequestId) {
    const res = await query(
      `SELECT 
         rh.id,
         rh.reservation_id,
         rh.emergency_request_id,
         rh.hospital_id,
         h.name AS hospital_name,
         rh.resource_id,
         res.resource_type,
         rh.action,
         rh.quantity,
         rh.notes,
         rh.created_at,
         u.name AS user_name,
         u.role AS user_role
       FROM reservation_history rh
       LEFT JOIN hospitals h ON rh.hospital_id = h.id
       LEFT JOIN resources res ON rh.resource_id = res.id
       LEFT JOIN users u ON rh.user_id = u.id
       WHERE rh.emergency_request_id = $1
       ORDER BY rh.created_at DESC, rh.id DESC;`,
      [emergencyRequestId]
    );

    return res.rows;
  }
}

module.exports = new ReservationService();
