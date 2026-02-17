import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// --- GET ALL PAYMENTS ---
router.get('/', authenticate, async (req, res) => {
  try {
    // LEFT JOIN para kahit walang tenant info, lilitaw pa rin ang amount record
    const query = `
      SELECT p.*, b.type as bill_type, u.name as tenant_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON b.tenant_id = u.id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows || []); 
  } catch (error) {
    console.error('Database query error:', error.message);
    // Siguraduhin na [] ang balik kahit mag-error ang SQL
    res.json([]); 
  }
});

// --- MANUAL RECORDING ---
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { bill_id, amount } = req.body;
    
    // Safety: Check kung exist ang bill_id para iwas Foreign Key error
    const billExists = await pool.query('SELECT id FROM bills WHERE id = $1', [bill_id]);
    if (billExists.rows.length === 0) {
      return res.status(400).json({ message: `Bill ID ${bill_id} not found.` });
    }

    const transactionId = `MANUAL-${Date.now()}`;
    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) 
       VALUES ($1, $2, 'manual', $3, 'completed')`,
      [bill_id, amount, transactionId]
    );

    // I-update rin ang bill as paid
    await pool.query('UPDATE bills SET status = $1 WHERE id = $2', ['paid', bill_id]);

    res.status(201).json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
