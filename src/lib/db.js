import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Opens (or returns the cached) database instance.
 */
export async function getDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('taj_fitness.db');
  return db;
}

/**
 * Initialize tables. Safe to call multiple times (IF NOT EXISTS).
 */
export async function initDb() {
  const database = await getDb();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS members (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT,
      photo_uri   TEXT,
      join_date   TEXT NOT NULL,
      fee         REAL NOT NULL DEFAULT 1000,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id          TEXT PRIMARY KEY,
      member_id   TEXT NOT NULL,
      month       TEXT NOT NULL,
      paid_on     TEXT NOT NULL,
      amount      REAL NOT NULL,
      created_at  TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add `fee` column if it doesn't exist (fails silently if it does)
  try {
    await database.execAsync(`ALTER TABLE members ADD COLUMN fee REAL NOT NULL DEFAULT 1000;`);
  } catch (_e) {
    // Column likely already exists, ignore
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  // Simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function currentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function nowISO() {
  return new Date().toISOString();
}

// ─── Members CRUD ────────────────────────────────────────────────────────────

/**
 * Get all active members with their current-month paid status.
 * @returns {Promise<Array>} members with `is_paid_this_month` boolean field
 */
export async function getMembers() {
  const database = await getDb();
  const month = currentMonth();
  const rows = await database.getAllAsync(
    `SELECT
       m.*,
       CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END AS is_paid_this_month,
       p.paid_on AS paid_on_this_month
     FROM members m
     LEFT JOIN payments p
       ON p.member_id = m.id AND p.month = ?
     WHERE m.is_active = 1
     ORDER BY m.created_at DESC`,
    [month]
  );
  return rows;
}

/**
 * Get a single member with their current-month paid status.
 * @param {string} id
 */
export async function getMemberById(id) {
  const database = await getDb();
  const month = currentMonth();
  const row = await database.getFirstAsync(
    `SELECT
       m.*,
       CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END AS is_paid_this_month,
       p.paid_on AS paid_on_this_month
     FROM members m
     LEFT JOIN payments p
       ON p.member_id = m.id AND p.month = ?
     WHERE m.id = ?`,
    [month, id]
  );
  return row;
}

/**
 * Create a new member.
 * @param {{ name: string, phone?: string, photo_uri?: string, fee?: number }} data
 */
export async function createMember({ name, phone = null, photo_uri = null, fee = 1000 }) {
  const database = await getDb();
  const id = generateId();
  const now = nowISO();
  const joinDate = now.split('T')[0];

  await database.runAsync(
    `INSERT INTO members (id, name, phone, photo_uri, join_date, fee, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, name.trim(), phone || null, photo_uri || null, joinDate, fee, now, now]
  );
  return id;
}

/**
 * Update a member's editable fields.
 * @param {string} id
 * @param {{ name?: string, phone?: string, photo_uri?: string, fee?: number }} data
 */
export async function updateMember(id, { name, phone, photo_uri, fee = 1000 }) {
  const database = await getDb();
  const now = nowISO();
  await database.runAsync(
    `UPDATE members SET name = ?, phone = ?, photo_uri = ?, fee = ?, updated_at = ? WHERE id = ?`,
    [name.trim(), phone || null, photo_uri || null, fee, now, id]
  );
}

/**
 * Soft-delete a member (is_active = 0) and hard-delete their payments.
 * @param {string} id
 */
export async function deleteMember(id) {
  const database = await getDb();
  // Delete payments first (cascade might handle this, but be explicit)
  await database.runAsync(`DELETE FROM payments WHERE member_id = ?`, [id]);
  // Hard delete the member too — no need to retain orphan records for a single-admin app
  await database.runAsync(`DELETE FROM members WHERE id = ?`, [id]);
}

// ─── Payments ────────────────────────────────────────────────────────────────

/**
 * Mark a member as paid for the current month.
 * Idempotent — does nothing if a record already exists.
 * @param {string} memberId
 * @param {number} amount - the fixed monthly fee
 */
export async function markMemberPaid(memberId, amount) {
  const database = await getDb();
  const month = currentMonth();
  const now = nowISO();
  const id = generateId();

  // Check if already paid this month
  const existing = await database.getFirstAsync(
    `SELECT id FROM payments WHERE member_id = ? AND month = ?`,
    [memberId, month]
  );
  if (existing) return; // already paid

  await database.runAsync(
    `INSERT INTO payments (id, member_id, month, paid_on, amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, memberId, month, now, amount, now]
  );
}

/**
 * Unmark a member's payment for the current month (undo mark-as-paid).
 * @param {string} memberId
 */
export async function unmarkMemberPaid(memberId) {
  const database = await getDb();
  const month = currentMonth();
  await database.runAsync(
    `DELETE FROM payments WHERE member_id = ? AND month = ?`,
    [memberId, month]
  );
}

/**
 * Get full payment history for a member, newest first.
 * @param {string} memberId
 */
export async function getPaymentsForMember(memberId) {
  const database = await getDb();
  const rows = await database.getAllAsync(
    `SELECT * FROM payments WHERE member_id = ? ORDER BY paid_on DESC`,
    [memberId]
  );
  return rows;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

/**
 * Returns aggregate stats for the current month dashboard.
 * @returns {{ totalMembers, paidCount, unpaidCount, collectedAmount, dueAmount }}
 */
export async function getDashboardStats() {
  const database = await getDb();
  const month = currentMonth();

  const totalRow = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM members WHERE is_active = 1`
  );
  const totalMembers = totalRow?.count ?? 0;

  const paidRow = await database.getFirstAsync(
    `SELECT COUNT(DISTINCT p.member_id) as count, SUM(p.amount) as total
     FROM payments p
     INNER JOIN members m ON m.id = p.member_id
     WHERE p.month = ? AND m.is_active = 1`,
    [month]
  );
  const paidCount = paidRow?.count ?? 0;
  const collectedAmount = paidRow?.total ?? 0;
  const unpaidCount = totalMembers - paidCount;

  const dueRow = await database.getFirstAsync(
    `SELECT SUM(m.fee) as totalDue
     FROM members m
     LEFT JOIN payments p ON p.member_id = m.id AND p.month = ?
     WHERE m.is_active = 1 AND p.id IS NULL`,
    [month]
  );
  const dueAmount = dueRow?.totalDue ?? 0;

  return { totalMembers, paidCount, unpaidCount, collectedAmount, dueAmount };
}

/**
 * Get last 5 members (for dashboard "Recent Members" section).
 */
export async function getRecentMembers() {
  const database = await getDb();
  const month = currentMonth();
  const rows = await database.getAllAsync(
    `SELECT
       m.*,
       CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END AS is_paid_this_month
     FROM members m
     LEFT JOIN payments p
       ON p.member_id = m.id AND p.month = ?
     WHERE m.is_active = 1
     ORDER BY m.created_at DESC
     LIMIT 5`,
    [month]
  );
  return rows;
}

// ─── Finance Stats ────────────────────────────────────────────────────────────

/**
 * Returns monthly finance stats for the given month (YYYY-MM).
 * @param {string} month - e.g. "2025-04"
 */
export async function getFinanceStatsForMonth(month) {
  const database = await getDb();

  const totalMembersRow = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM members WHERE is_active = 1`
  );
  const totalMembers = totalMembersRow?.count ?? 0;

  const paidRow = await database.getFirstAsync(
    `SELECT COUNT(DISTINCT p.member_id) as count, SUM(p.amount) as total
     FROM payments p
     INNER JOIN members m ON m.id = p.member_id
     WHERE p.month = ? AND m.is_active = 1`,
    [month]
  );
  const paidCount = paidRow?.count ?? 0;
  const collectedAmount = paidRow?.total ?? 0;

  const dueRow = await database.getFirstAsync(
    `SELECT SUM(m.fee) as totalDue
     FROM members m
     LEFT JOIN payments p ON p.member_id = m.id AND p.month = ?
     WHERE m.is_active = 1 AND p.id IS NULL`,
    [month]
  );
  const dueAmount = dueRow?.totalDue ?? 0;

  return { totalMembers, paidCount, collectedAmount, dueAmount };
}

/**
 * Get all months that have at least one payment, for the history list.
 * Returns [{ month, paid_count, total_collected }] newest first.
 */
export async function getPaymentMonths() {
  const database = await getDb();
  const rows = await database.getAllAsync(
    `SELECT
       month,
       COUNT(DISTINCT member_id) as paid_count,
       SUM(amount) as total_collected
     FROM payments
     GROUP BY month
     ORDER BY month DESC`
  );
  return rows;
}

/**
 * Get recent transactions for a given month, with member info.
 * @param {string} month - e.g. "2025-04"
 */
export async function getTransactionsForMonth(month) {
  const database = await getDb();
  const rows = await database.getAllAsync(
    `SELECT
       p.*,
       m.name AS member_name,
       m.photo_uri AS member_photo
     FROM payments p
     INNER JOIN members m ON m.id = p.member_id
     WHERE p.month = ?
     ORDER BY p.paid_on DESC`,
    [month]
  );
  return rows;
}
