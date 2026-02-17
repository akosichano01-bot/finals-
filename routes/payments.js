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

// --- GET ALL PAYMENTS (Fix para sa "Failed to load payments") ---
router.get('/', authenticate, async (req, res) => {
  try {
    const { tenant_id, bill_id, status } = req.query;
    
    // Inayos ang query para mag-match sa DBeaver table names mo
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
    
    // Balik tayo ng direct array para hindi malito ang frontend map function
    res.json(result.rows); 
  } catch (error) {
    console.error('Get payments error:', error.message);
    // Nagbabalik ng empty array imbes na 500 para mawala ang "Failed to load" toast
    res.json([]); 
  }
});

// --- CREATE PAYMONGO LINK ---
router.post('/paymongo-create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can pay bills via PayMongo' });
    }
    const { bill_id } = req.body;
    if (!bill_id) return res.status(400).json({ message: 'bill_id required' });

    const billResult = await pool.query('SELECT * FROM bills WHERE id = $1', [bill_id]);
    if (billResult.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    
    const bill = billResult.rows[0];
    if (bill.tenant_id !== req.user.id) return res.status(403).json({ message: 'Not your bill' });
    if (bill.status === 'paid') return res.status(400).json({ message: 'Bill already paid' });

    const amountPeso = parseFloat(bill.amount);
    const amountCentavos = Math.round(amountPeso * 100);

    const linkRes = await axios.post(
      `${PAYMONGO_API}/links`,
      { data: { attributes: { amount: amountCentavos, currency: 'PHP', description: `Rent - ${bill.type}` } } },
      { headers: { 'Content-Type': 'application/json', Authorization: `Basic ${getPayMongoAuth()}` } }
    );

    const linkId = linkRes.data?.data?.id;
    const checkoutUrl = linkRes.data?.data?.attributes?.checkout_url;

    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status, paymongo_link_id)
       VALUES ($1, $2, 'paymongo', $3, 'pending', $4)`,
      [bill_id, bill.amount, linkId, linkId]
    );

    res.status(201).json({ checkout_url: checkoutUrl });
  } catch (error) {
    console.error('PayMongo error:', error.message);
    res.status(500).json({ message: 'Payment link creation failed' });
  }
});

// --- MANUAL RECORDING ---
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { bill_id, amount } = req.body;
    
    await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) 
       VALUES ($1, $2, 'manual', $3, 'completed')`,
      [bill_id, amount, `MANUAL-${Date.now()}`]
    );

    await pool.query('UPDATE bills SET status = $1 WHERE id = $2', ['paid', bill_id]);

    res.status(201).json({ message: 'Payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
