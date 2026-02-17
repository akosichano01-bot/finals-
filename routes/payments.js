import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// --- GET ALL PAYMENTS ---
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
             b.type as bill_type, b.amount as bill_amount,
             u.name as tenant_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON b.tenant_id = u.id
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query);
    // Siguraduhing laging array ang response
    res.json(result.rows || []); 
  } catch (error) {
    console.error('Get payments error:', error.message);
    res.status(200).json([]); // Ibalik ang empty array imbes na crash
  }
});

// --- MANUAL RECORDING ---
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { bill_id, amount } = req.body;
    
    // I-check kung valid ang bill_id para iwas Foreign Key error
    const billExists = await client.query('SELECT id FROM bills WHERE id = $1', [bill_id]);
    if (billExists.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid Bill ID' });
    }

    await client.query('BEGIN');
    const transactionId = `MANUAL-${Date.now()}`;

    // Insert payment record
    await client.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) 
       VALUES ($1, $2, 'manual', $3, 'completed')`,
      [bill_id, amount, transactionId]
    );

    // I-update ang status ng bill
    await client.query('UPDATE bills SET status = $1 WHERE id = $2', ['paid', bill_id]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Manual recording error:', error.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
