const { pool } = require('../../config/database');

async function createProfile({ userId, staffCode, fullName, displayName, phone, alternatePhone,
  emergencyContactName, emergencyContactPhone, address, citizenshipNumber,
  citizenshipFrontUrl, citizenshipBackUrl, profilePhotoUrl, profilePhotoPublicId,
  joiningDate, employmentType, department, designation, status, notes, createdBy }) {

  const result = await pool.query(
    `INSERT INTO staff_profiles (user_id, staff_code, full_name, display_name, phone, alternate_phone,
      emergency_contact_name, emergency_contact_phone, address, citizenship_number,
      citizenship_front_url, citizenship_back_url, profile_photo_url, profile_photo_public_id,
      joining_date, employment_type, department, designation, status, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING *`,
    [userId, staffCode, fullName, displayName, phone, alternatePhone,
     emergencyContactName, emergencyContactPhone, address, citizenshipNumber,
     citizenshipFrontUrl, citizenshipBackUrl, profilePhotoUrl, profilePhotoPublicId,
     joiningDate, employmentType, department, designation, status, notes, createdBy]
  );
  return result.rows[0];
}

async function getProfileByUserId(userId) {
  const result = await pool.query(
    `SELECT * FROM staff_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getProfileByStaffCode(staffCode) {
  const result = await pool.query(
    `SELECT * FROM staff_profiles WHERE staff_code = $1`,
    [staffCode]
  );
  return result.rows[0] || null;
}

async function updateProfile(userId, fields) {
  // fields is an object of column->value pairs
  const setClauses = [];
  const values = [];
  let idx = 1;
  for (const [col, val] of Object.entries(fields)) {
    setClauses.push(`${col} = $${idx}`);
    values.push(val);
    idx++;
  }
  values.push(userId);
  const result = await pool.query(
    `UPDATE staff_profiles SET ${setClauses.join(', ')}, updated_at = NOW() WHERE user_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function updateStatus(userId, status) {
  const result = await pool.query(
    `UPDATE staff_profiles SET status = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [status, userId]
  );
  const profile = result.rows[0];
  if (profile && (status === 'suspended' || status === 'terminated')) {
    await releaseOwnedTickets(userId);
  }
  return profile || null;
}

async function listStaffProfiles() {
  const result = await pool.query(
    `SELECT sp.*, u.email, u.role, u.client_id, u.status AS user_status, u.role_id,
            r.name AS role_name, r.slug AS role_slug
     FROM staff_profiles sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY sp.created_at DESC`
  );
  return result.rows;
}

async function releaseOwnedTickets(userId) {
  const supportTicketService = require('../support/supportTicket.service');
  // Find all in_progress tickets assigned to this admin
  const result = await pool.query(
    `SELECT id FROM support_tickets WHERE assigned_admin_id = $1 AND status = 'in_progress'`,
    [userId]
  );
  for (const ticket of result.rows) {
    try {
      await supportTicketService.releaseTicket(ticket.id, userId);
    } catch (err) {
      console.error(`Failed to release ticket ${ticket.id}:`, err.message);
    }
  }
}

module.exports = { createProfile, getProfileByUserId, getProfileByStaffCode, updateProfile, updateStatus, listStaffProfiles };