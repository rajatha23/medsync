const { query } = require('../db');

class NotificationService {
  async list(user, filters = {}) {
    const limit = Math.min(Math.max(Number(filters.limit) || 30, 1), 100);
    const unreadOnly = String(filters.unread_only || '').toLowerCase() === 'true';
    const values = [user.role];
    let target = `(n.target_role IS NULL OR n.target_role = $1)`;
    if (user.hospital_id) {
      values.push(user.hospital_id);
      target += ` AND (n.target_hospital_id IS NULL OR n.target_hospital_id = $${values.length})`;
    } else {
      target += ` AND n.target_hospital_id IS NULL`;
    }
    if (unreadOnly) target += ` AND n.is_read = FALSE`;
    values.push(limit);

    const stored = await query(`
      SELECT n.id, n.title, n.message, n.severity, n.target_role,
             n.target_hospital_id, n.reference_emergency_id, n.is_read, n.created_at
      FROM notifications n
      WHERE ${target}
      ORDER BY n.created_at DESC
      LIMIT $${values.length};
    `, values);

    // Also expose live H4 operational alerts even when a coordinator has not persisted a notification.
    const live = await query(`
      SELECT h.id AS hospital_id, h.name AS hospital_name, h.status,
             COALESCE(SUM(CASE WHEN r.resource_type='ICU_BED' THEN r.available_quantity ELSE 0 END),0) AS available_icu,
             COALESCE(SUM(CASE WHEN r.category='BLOOD' THEN r.available_quantity ELSE 0 END),0) AS available_blood,
             COALESCE(SUM(CASE WHEN r.category='BLOOD' THEN r.critical_threshold ELSE 0 END),0) AS blood_threshold
      FROM hospitals h LEFT JOIN resources r ON r.hospital_id=h.id
      GROUP BY h.id, h.name, h.status
      ORDER BY h.name;
    `);

    const liveNotifications = [];
    for (const h of live.rows) {
      if (h.status === 'DIVERT') liveNotifications.push({
        id: `live-divert-${h.hospital_id}`, title: `Facility on DIVERT: ${h.hospital_name}`,
        message: `${h.hospital_name} is currently diverting incoming demand. Review alternate capacity.`,
        severity: 'CRITICAL', is_read: false, live: true, created_at: new Date().toISOString(), hospital_id: h.hospital_id
      });
      else if (h.status === 'SURGE') liveNotifications.push({
        id: `live-surge-${h.hospital_id}`, title: `Surge capacity: ${h.hospital_name}`,
        message: `${h.hospital_name} is operating in SURGE status with ${h.available_icu} ICU beds available.`,
        severity: 'WARNING', is_read: false, live: true, created_at: new Date().toISOString(), hospital_id: h.hospital_id
      });
      if (Number(h.available_blood) <= Number(h.blood_threshold) && Number(h.blood_threshold) > 0) liveNotifications.push({
        id: `live-blood-${h.hospital_id}`, title: `Blood reserve alert: ${h.hospital_name}`,
        message: `${h.hospital_name} is at or below its configured blood reserve threshold (${h.available_blood} units available).`,
        severity: Number(h.available_blood) === 0 ? 'CRITICAL' : 'WARNING', is_read: false, live: true, created_at: new Date().toISOString(), hospital_id: h.hospital_id
      });
    }

    const notifications = [...stored.rows, ...liveNotifications]
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    return {
      notifications,
      unread_count: notifications.filter(n => !n.is_read).length,
      generated_at: new Date().toISOString()
    };
  }

  async markRead(id, user) {
    if (String(id).startsWith('live-')) return { id, is_read: true, live: true };
    const values = [id, user.role];
    let sql = `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND (target_role IS NULL OR target_role=$2)`;
    if (user.hospital_id) { values.push(user.hospital_id); sql += ` AND (target_hospital_id IS NULL OR target_hospital_id=$3)`; }
    else sql += ` AND target_hospital_id IS NULL`;
    sql += ' RETURNING id, is_read;';
    const result = await query(sql, values);
    if (!result.rows.length) { const e=new Error('Notification not found.'); e.statusCode=404; throw e; }
    return result.rows[0];
  }

  async markAllRead(user) {
    const values=[user.role];
    let sql=`UPDATE notifications SET is_read=TRUE WHERE (target_role IS NULL OR target_role=$1)`;
    if (user.hospital_id) { values.push(user.hospital_id); sql+=` AND (target_hospital_id IS NULL OR target_hospital_id=$2)`; }
    else sql+=' AND target_hospital_id IS NULL';
    const result=await query(sql,values);
    return { updated_count: result.rowCount };
  }
}
module.exports = new NotificationService();
