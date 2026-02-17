import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js'; 
import { poolExport as pool } from '../config/database.js'; 

const router = express.Router();

// --- GET UNPAID BILLS (Para sa Pay Now section ng Tenant) ---
router.get('/my-unpaid', authenticate, async (req, res) => {
  try {
    // Siguraduhin na tenant ang tumatawag
    if (req.user.role !== 'tenant') {
      return res.json([]); // Balik empty array imbes na error para hindi mag-crash ang UI
    }

    const query = `
      SELECT b.id, b.type, b.amount, b.due_date, b.status, b.description
      FROM bills b
      WHERE b.tenant_id = $1 AND b.status = 'unpaid'
      ORDER BY b.due_date ASC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows || []); 
  } catch (error) {
    console.error('Get unpaid bills error:', error);
    res.status(500).json([]); // Always return array
  }
});

// --- GET ALL BILLS (Para sa Bills Table) ---
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

    // Filter by role: Kung tenant, sarili lang dapat
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
    
    // IMPORTANTE: Siguraduhin na ang balik ay result.rows lang (Array)
    // Huwag ibalot sa { bills: result.rows } kung ang frontend mo ay diretsong .map(res.data)
    res.json(result.rows || []); 
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(200).json([]); // Ibalik ang empty array para iwas blank screen
  }
});

// --- ANG IBANG ROUTES (GET BY ID, GENERATE, UPDATE, DELETE) AY OKAY NA ---
// Ipagpatuloy lang ang existing code mo dito...

export default router;
