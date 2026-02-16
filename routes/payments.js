import express from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function getPayMongoAuth() {
  const key = process.env.PAYMONGO_SECRET_KEY || '';
  return Buffer.from(key + ':').toString('base64');
}

// Create PayMongo payment link (tenant only)
router.post('/paymongo-create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can pay bills via PayMongo' });
    }
    const { bill_id } = req.body;
    if (!bill_id) return res.status(400).json({ message: 'bill_id required' });

    // PostgreSQL: Gamit ang $1
    const billResult = await pool.query('SELECT * FROM bills WHERE id = $1', [bill_id]);
    if (billResult.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    
    const bill = billResult.rows[0];
    if (bill.tenant_id !== req.user.id) return res.status(403).json({ message: 'Not your bill' });
    if (bill.status === 'paid') return res.status(400).json({ message: 'Bill already paid' });

    const amountPeso = parseFloat(bill.amount);
    const amountCentavos = Math.round(amountPeso * 100);
    if (amountCentavos < 100) return res.status(400).json({ message: 'Minimum amount is ₱1.00' });

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret) return res.status(500).json({ message: 'PayMongo not configured' });

    const linkRes = await axios.post(
      `${PAYMONGO_API}/links`,
      {
        data: {
          attributes: {
            amount: amountCentavos,
            currency: 'PHP',
            description: `Rent - ${bill.type} - Ancheta Apartment`,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${getPayMongoAuth()}`,
        },
      }
    );

    const linkId = linkRes.data?.data?.id;
    const checkoutUrl = linkRes.data?.data?.attributes?.checkout_url;
    if (!linkId || !checkoutUrl) return res.status(500).json({ message: 'PayMongo link creation failed' });

    // PostgreSQL Insert
    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status, paymongo_link_id)
       VALUES ($1, $2, 'paymongo', $3, 'pending', $4)`,
      [bill_id, bill.amount, linkId, linkId]
    );

    const paymentRow = await pool.query('SELECT * FROM payments ORDER BY id DESC LIMIT 1');
    const payment = paymentRow.rows[0];

    res.status(201).json({
      checkout_url: checkoutUrl,
      payment_id: payment.id,
      message: 'Open the checkout URL to pay. After paying, click "Confirm payment received".',
    });
  } catch (error) {
    console.error('PayMongo create error:', error.response?.data || error.message);
    res.status(500).json({
      message: error.response?.data?.errors?.[0]?.detail || 'Payment link creation failed',
    });
  }
});

// Verify PayMongo payment
router.get('/verify/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const paymentResult = await pool.query(
      `SELECT p.*, b.tenant_id FROM payments p JOIN bills b ON p.bill_id = b.id WHERE p.id = $1`,
      [id]
    );
    if (paymentResult.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    
    const payment = paymentResult.rows[0];
    if (req.user.role === 'tenant' && payment.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Not your payment' });
    }

    const linkId = payment.paymongo_link_id;
    if (!linkId) return res.json({ confirmed: false, message: 'Not a PayMongo payment' });

    const linkRes = await axios.get(`${PAYMONGO_API}/links/${linkId}`, {
      headers: { Authorization: `Basic ${getPayMongoAuth()}` },
    });
    
    const status = linkRes.data?.data?.attributes?.status;
    if (status === 'paid') {
      await pool.query('UPDATE payments SET status = $1 WHERE id = $2', ['completed', id]);
      await pool.query('UPDATE bills SET status = $1 WHERE id = $2', ['paid', payment.bill_id]);
      return res.json({ confirmed: true, message: 'Payment confirmed.' });
    }
    return res.json({ confirmed: false, message: 'Payment not yet received.', status });
  } catch (error) {
    console.error('Verify payment error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Get all payments
router.get('/', authenticate, async (req, res) => {
  try {
    const { tenant_id, bill_id, status } = req.query;
    let query = `
      SELECT p.*, 
             b.type as bill_type, b.amount as bill_amount, b.description as bill_description,
             u.name as tenant_name, u.email as tenant_email,
             un.unit_number, un.building
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
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

    if (bill_id) {
      query += ` AND p.bill_id = $${paramCount++}`;
      params.push(bill_id);
    }

    if (status) {
      query += ` AND p.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment (manual recording)
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { bill_id, amount } = req.body;
    if (!bill_id || !amount) return res.status(400).json({ message: 'Missing required fields' });
    
    const billResult = await pool.query('SELECT * FROM bills WHERE id = $1', [bill_id]);
    if (billResult.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    
    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) VALUES ($1, $2, 'manual', $3, 'completed')`,
      [bill_id, amount, `MANUAL-${Date.now()}`]
