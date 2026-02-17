import express from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// --- GET ALL PAYMENTS ---
router.get('/', authenticate, async (req, res) => {
  try {
    const isTenant = req.user.role === 'tenant';

    const query = `
      SELECT 
        p.id, p.amount, p.payment_method, p.transaction_id, p.status, p.created_at,
        b.type as bill_type, 
        u.name as tenant_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON b.tenant_id = u.id
      ${isTenant ? 'WHERE b.tenant_id = $1' : ''}
      ORDER BY p.created_at DESC
    `;
    
    const result = isTenant ? await pool.query(query, [req.user.id]) : await pool.query(query);
    
    // Gamot sa .map() error sa frontend: Laging array ang ibabalik
    res.json(result.rows || []); 
    
  } catch (error) {
    console.error('Database query error:', error.message);
    // Kapag may error (gaya ng "relation does not exist"), empty array pa rin ang balik
    res.status(200).json([]); 
  }
});

// --- TENANT: CREATE PAYMONGO PAYMENT LINK ---
router.post('/paymongo-create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can create PayMongo payments' });
    }

    const { bill_id } = req.body;
    if (!bill_id) {
      return res.status(400).json({ message: 'bill_id is required' });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({ message: 'PayMongo not configured' });
    }

    // Verify bill exists, belongs to tenant, and is unpaid
    const billRes = await pool.query(
      `SELECT b.id, b.amount, b.type, b.status, b.due_date
       FROM bills b
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bill_id, req.user.id]
    );

    if (billRes.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billRes.rows[0];
    if (bill.status !== 'unpaid') {
      return res.status(400).json({ message: 'Bill is not unpaid' });
    }

    // PayMongo expects integer amount in centavos
    const amount = Math.round(Number(bill.amount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid bill amount' });
    }

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    // NOTE: PayMongo API details may change; keep this isolated for easy updates.
    const payload = {
      data: {
        attributes: {
          amount,
          description: `${bill.type} payment`,
          remarks: `Bill #${bill.id} due ${new Date(bill.due_date).toLocaleDateString()}`,
        },
      },
    };

    const linkRes = await axios.post('https://api.paymongo.com/v1/links', payload, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const link = linkRes.data?.data;
    const checkoutUrl = link?.attributes?.checkout_url || link?.attributes?.url;
    const linkId = link?.id;

    if (!checkoutUrl || !linkId) {
      return res.status(502).json({ message: 'Failed to create PayMongo checkout link' });
    }

    // Record pending payment (bill remains unpaid until confirmation/webhook flow exists)
    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, paymongo_link_id, status)
       VALUES ($1, $2, 'paymongo', $3, $4, 'pending')`,
      [bill.id, bill.amount, `PAYMONGO-LINK-${Date.now()}`, linkId]
    );

    res.json({ checkout_url: checkoutUrl });
  } catch (error) {
    const msg =
      error.response?.data?.errors?.[0]?.detail ||
      error.response?.data?.message ||
      error.message ||
      'PayMongo error';

    console.error('PayMongo create error:', msg);
    res.status(502).json({ message: 'PayMongo request failed' });
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
