import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// Get next tenant email (tenant@ancheta.com, tenant2@ancheta.com, ...)
async function getNextTenantEmail() {
  // PostgreSQL: Likas na case-sensitive ang LIKE, gamitin ang $1 para sa pattern kung kailangan
  const result = await pool.query(
    "SELECT email FROM users WHERE role = 'tenant' AND email LIKE 'tenant%@ancheta.com' ORDER BY email DESC LIMIT 1"
  );
  if (result.rows.length === 0) {
    return 'tenant@ancheta.com';
  }
  const email = result.rows[0].email;
  const match = email.match(/^tenant(\d*)@ancheta\.com$/);
  const n = match && match[1] ? parseInt(match[1], 10) + 1 : 2;
  return `tenant${n}@ancheta.com`;
}

// Create tenant (Manager and Staff)
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const email = await getNextTenantEmail();
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // PostgreSQL: Gamit ang $1, $2, $3...
    await pool.query(
      `INSERT INTO users (email, password, name, role, phone) VALUES ($1, $2, $3, 'tenant', $4)`,
      [email, hashedPassword, name, phone || null]
    );
    
    const result = await pool.query(
      'SELECT id, email, name, role, phone, unit_id, created_at FROM users WHERE email = $1',
      [email]
    );
    
    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: result.rows[0],
      login_email: email,
      login_password: defaultPassword,
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tenants
router.get('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.unit_id, u.created_at,
              un.unit_number, un.floor, un.building, un.rent_amount,
              COUNT(b.id) as total_bills,
              SUM(CASE WHEN b.status = 'unpaid' THEN b.amount ELSE 0 END) as unpaid_amount
       FROM users u
       LEFT JOIN units un ON u.unit_id = un.id
       LEFT JOIN bills b ON u.id = b.tenant_id
       WHERE u.role = 'tenant'
       GROUP BY u.id, u.email, u.name, u.phone, u.unit_id, u.created_at, un.unit_number, un.floor, un.building, un.rent_amount
       ORDER BY u.created_at DESC`
    );

    res.json({ tenants: result.rows });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign tenant to unit
router.post('/:id/assign-unit', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { unit_id } = req.body;

    // Check if unit exists
    const unitResult = await pool.query('SELECT id, status FROM units WHERE id = $1', [unit_id]);
    if (unitResult.rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Check if unit is already occupied
    const occupiedCheck = await pool.query(
      'SELECT id FROM users WHERE unit_id = $1 AND role = $2',
      [unit_id, 'tenant']
    );
    if (occupiedCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Unit is already occupied' });
    }

    // Update tenant's unit
    await pool.query(
      'UPDATE users SET unit_id = $1 WHERE id = $2 AND role = $3',
      [unit_id, id, 'tenant']
    );

    const result = await pool.query(
      'SELECT u.*, un.unit_number, un.building FROM users u LEFT JOIN units un ON u.unit_id = un.id WHERE u.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Update unit status to occupied
    await pool.query("UPDATE units SET status = 'occupied' WHERE id = $1", [unit_id]);

    res.json({ message: 'Tenant assigned to unit successfully', tenant: result.rows[0] });
  } catch (error) {
    console.error('Assign unit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove tenant from unit
router.post('/:id/remove-unit', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;

    const tenantResult = await pool.query(
      'SELECT unit_id FROM users WHERE id = $1 AND role = $2',
      [id, 'tenant']
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const unit_id = tenantResult.rows[0].unit_id;

    // Update tenant's unit to NULL
    await pool.query('UPDATE users SET unit_id = NULL WHERE id = $1', [id]);

    // Update unit status back to available
    if (unit_id) {
      await pool.query("UPDATE units SET status = 'available' WHERE id = $1", [unit_id]);
    }

    res.json({ message: 'Tenant removed from unit successfully' });
  } catch (error) {
    console.error('Remove unit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
