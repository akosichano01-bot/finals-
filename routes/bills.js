import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js'; 
import { poolExport as pool } from '../config/database.js'; 

const router = express.Router();

// --- NEW ENDPOINT: Get Unpaid Bills for the Logged-in Tenant ---
// Ito ang hinahanap ng frontend para lumitaw ang "Pay Now" button
router.get('/my-unpaid', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can access this endpoint' });
    }

    const query = `
      SELECT b.id, b.type, b.amount, b.due_date, b.status, b.description
      FROM bills b
      WHERE b.tenant_id = $1 AND b.status = 'unpaid'
      ORDER BY b.due_date ASC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows || []); // Laging array ang balik para iwas .map() error
  } catch (error) {
    console.error('Get unpaid bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Get all bills (with existing filters) ---
router.get('/', authenticate, async (req, res) => {
  try {
    const { tenant_id, status, month, year } = req.query;
    let query = `
      SELECT b.*, 
             u.name as tenant_name, u.email as tenant_email,
             un.unit_number, un.building
      FROM bills b
      JOIN users u ON b.tenant_id = u.id
      LEFT JOIN units un ON u.unit_id = un.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (req.user.role === 'tenant') {
      query += ` AND b.tenant_id = $${paramCount++}`;
      params.push(req.user.id);
    } else if (tenant_id) {
      query += ` AND b.tenant_id = $${paramCount++}`;
      params.push(tenant_id);
    }

    if (status) {
      query += ` AND b.status = $${paramCount++}`;
      params.push(status);
    }

    if (month) {
      query += ` AND EXTRACT(MONTH FROM b.due_date) = $${paramCount++}`;
      params.push(parseInt(month));
    }

    if (year) {
      query += ` AND EXTRACT(YEAR FROM b.due_date) = $${paramCount++}`;
      params.push(parseInt(year));
    }

    query += ' ORDER BY b.due_date DESC, b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows || []); // Inayos para diretsong array ang balik
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bill by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, 
              u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
              un.unit_number, un.building, un.floor
       FROM bills b
       JOIN users u ON b.tenant_id = u.id
       LEFT JOIN units un ON u.unit_id = un.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });

    const bill = result.rows[0];
    if (req.user.role === 'tenant' && bill.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate monthly rent bills
router.post('/generate-monthly', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const tenantsWithUnits = await pool.query(
      `SELECT u.id as tenant_id, un.rent_amount, un.unit_number, un.building
       FROM users u
       INNER JOIN units un ON u.unit_id = un.id
       WHERE u.role = 'tenant' AND u.unit_id IS NOT NULL`
    );

    let created = 0;
    for (const row of tenantsWithUnits.rows) {
      const existing = await pool.query(
        `SELECT id FROM bills WHERE tenant_id = $1 AND EXTRACT(MONTH FROM due_date) = $2 AND EXTRACT(YEAR FROM due_date) = $3 AND type = $4`,
        [row.tenant_id, month, year, 'Rent']
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO bills (tenant_id, type, amount, description, due_date, status)
           VALUES ($1, 'Rent', $2, $3, $4, 'unpaid')`,
          [row.tenant_id, row.rent_amount, `Monthly rent - ${row.building} ${row.unit_number}`, dueDate]
        );
        created++;
      }
    }
    res.json({ message: 'Monthly bills generated', created });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update bill
router.put('/:id', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, due_date, status } = req.body;

    const result = await pool.query(
      `UPDATE bills SET type = $1, amount = $2, description = $3, due_date = $4, status = $5
       WHERE id = $6 RETURNING *`,
      [type, amount, description, due_date, status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill updated successfully', bill: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete bill
router.delete('/:id', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const paymentCheck = await pool.query('SELECT id FROM payments WHERE bill_id = $1', [id]);
    if (paymentCheck.rows.length > 0) return res.status(400).json({ message: 'Cannot delete bill with existing payments' });

    const result = await pool.query('DELETE FROM bills WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
