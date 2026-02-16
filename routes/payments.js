const express = require('express');
const axios = require('axios');
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function getPayMongoAuth() {
  const key = process.env.PAYMONGO_SECRET_KEY || '';
  return Buffer.from(key + ':').toString('base64');
}

// Create PayMongo payment link (tenant only) - returns checkout URL
router.post('/paymongo-create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can pay bills via PayMongo' });
    }
    const { bill_id } = req.body;
    if (!bill_id) return res.status(400).json({ message: 'bill_id required' });

    const billResult = await pool.query('SELECT * FROM bills WHERE id = ?', [bill_id]);
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

    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status, paymongo_link_id)
       VALUES (?, ?, 'paymongo', ?, 'pending', ?)`,
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

// Verify PayMongo payment (tenant only) - confirm payment received
router.get('/verify/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const paymentResult = await pool.query(
      `SELECT p.*, b.tenant_id FROM payments p JOIN bills b ON p.bill_id = b.id WHERE p.id = ?`,
      [id]
    );
    if (paymentResult.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    const payment = paymentResult.rows[0];
    if (req.user.role === 'tenant' && payment.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Not your payment' });
    }

    const linkId = payment.paymongo_link_id;
    if (!linkId) return res.json({ confirmed: false, message: 'Not a PayMongo payment' });

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret) return res.status(500).json({ message: 'PayMongo not configured' });

    const linkRes = await axios.get(`${PAYMONGO_API}/links/${linkId}`, {
      headers: { Authorization: `Basic ${getPayMongoAuth()}` },
    });
    const status = linkRes.data?.data?.attributes?.status;
    if (status === 'paid') {
      await pool.query('UPDATE payments SET status = ? WHERE id = ?', ['completed', id]);
      await pool.query('UPDATE bills SET status = ? WHERE id = ?', ['paid', payment.bill_id]);
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

    // Filter by tenant (tenants can only see their own payments)
    if (req.user.role === 'tenant') {
      query += ' AND b.tenant_id = ?';
      params.push(req.user.id);
    } else if (tenant_id) {
      query += ' AND b.tenant_id = ?';
      params.push(tenant_id);
    }

    if (bill_id) {
      query += ' AND p.bill_id = ?';
      params.push(bill_id);
    }

    if (status) {
      query += ' AND p.status = ?';
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

// Get payment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, 
              b.type as bill_type, b.amount as bill_amount, b.description as bill_description,
              u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
              un.unit_number, un.building
       FROM payments p
       JOIN bills b ON p.bill_id = b.id
       JOIN users u ON b.tenant_id = u.id
       LEFT JOIN units un ON u.unit_id = un.id
       WHERE p.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.rows[0];

    // Tenants can only view their own payments
    if (req.user.role === 'tenant' && payment.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment - staff/manager can record non-PayMongo; tenants use PayMongo via /paymongo-create
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { bill_id, amount } = req.body;
    if (!bill_id || !amount) return res.status(400).json({ message: 'Missing required fields' });
    const billResult = await pool.query('SELECT * FROM bills WHERE id = ?', [bill_id]);
    if (billResult.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    const bill = billResult.rows[0];
    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) VALUES (?, ?, 'manual', ?, 'completed')`,
      [bill_id, amount, `MANUAL-${Date.now()}`]
    );
    const paymentInsert = await pool.query('SELECT * FROM payments ORDER BY id DESC LIMIT 1');
    await pool.query('UPDATE bills SET status = ? WHERE id = ?', ['paid', bill_id]);
    res.status(201).json({ message: 'Payment recorded', payment: paymentInsert.rows[0] });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status (Manager and Staff only)
router.put('/:id/status', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE payments SET status = ? WHERE id = ?',
      [status, id]
    );
    const result = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update bill status if payment is completed
    if (status === 'completed') {
      const payment = result.rows[0];
      await pool.query(
        'UPDATE bills SET status = ? WHERE id = ?',
        ['paid', payment.bill_id]
      );
    }

    res.json({ message: 'Payment status updated successfully', payment: result.rows[0] });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
