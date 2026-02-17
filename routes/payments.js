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

// --- GET ALL PAYMENTS ---
router.get('/', authenticate, async (req, res) => {
  try {
    const { tenant_id, bill_id, status } = req.query;
    
    let query = `
      SELECT p.*, 
             b.type as bill_type, b.amount as bill_amount, b.description as bill_description,
             u.name as tenant_name, u.email as tenant_email,
             un.unit_number, un.building
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON b.tenant_id = u.id
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
    
    // Siguraduhin na array ang balik para hindi mag-crash ang .map() sa frontend
    res.json(result.rows || []); 
    
  } catch (error) {
    console.error('Get payments error:', error.message);
    // Laging magpadala ng empty array [] imbes na error status
    res.status(200).json([]); 
  }
});

// --- MANUAL RECORDING ---
router.post('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { bill_id, amount } = req.body;
    if (!bill_id || !amount) return
