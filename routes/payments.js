import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// --- GET ALL PAYMENTS ---
router.get('/', authenticate, async (req, res) => {
  try {
    // Inayos ang query para mag-handle ng filtering kung kailangan (hal. status o tenant)
    const query = `
      SELECT 
        p.id, p.amount, p.payment_method, p.transaction_id, p.status, p.created_at,
        b.type as bill_type, 
        u.name as tenant_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON b.tenant_id = u.id
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    // Gamot sa .map() error sa frontend: Laging array ang ibabalik
    res.json(result.rows || []); 
    
  } catch (error) {
    console.error('Database query error:', error.message);
    // Kapag may error (gaya ng "relation does not exist"), empty array pa rin ang balik
    res.status(200).json([]); 
  }
});

// --- MANUAL RECORDING ---
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  const client = await pool.connect(); // Gumamit ng client para sa Transaction
  try {
    const { bill_id, amount } = req.body;
    
    if (!bill_id || !amount) {
      return res.status(400).json({ message: 'Bill ID and Amount are required.' });
    }

    // 1. Safety Check: Siguraduhing existing ang Bill ID para iwas Foreign Key error
    const billExists = await client.query('SELECT id, status FROM bills WHERE id = $1', [bill_id]);
    if (billExists.rows.length === 0) {
      return res.status(404).json({ message: `Bill ID ${bill_id} not found.` });
    }

    // Simulan ang database transaction
    await client.query('BEGIN');

    const transactionId = `MANUAL-${Date.now()}`;

    // 2. I-insert ang payment record
    await client.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) 
       VALUES ($1, $2, 'manual', $3, 'completed')`,
      [bill_id, amount, transactionId]
    );

    // 3. I-update ang status ng bill para mag-reflect sa Dashboard
    await client.query('UPDATE bills SET status = $1 WHERE id = $2', ['paid', bill_id]);

    // I-save ang lahat ng changes
    await client.query('COMMIT');

    res.status(201).json({ 
      success: true,
      message: 'Payment recorded successfully',
      transaction_id: transactionId 
    });

  } catch (error) {
    await client.query('ROLLBACK'); // I-undo ang changes kung mag-error
    console.error('Manual recording error:', error.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release(); // I-release ang database connection
  }
});

export default router;
