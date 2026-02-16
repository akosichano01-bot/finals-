import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// Get all units
router.get('/', authenticate, async (req, res) => {
  try {
    const { building, floor, status } = req.query;
    let query = `
      SELECT u.*, 
             us.name as tenant_name, us.email as tenant_email, us.phone as tenant_phone,
             COALESCE(u.maintenance_status, 'none') as maintenance_status
      FROM units u
      LEFT JOIN users us ON u.id = us.unit_id AND us.role = 'tenant'
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (building) {
      query += ` AND u.building = $${paramCount++}`;
      params.push(building);
    }

    if (floor) {
      query += ` AND u.floor = $${paramCount++}`;
      params.push(parseInt(floor));
    }

    if (status) {
      query += ` AND u.status = $${paramCount++}`;
      params.push(status);
    }

    query += ' ORDER BY u.building, u.floor, u.unit_number';

    const result = await pool.query(query, params);
    res.json({ units: result.rows });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unit by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT u.*, 
              us.id as tenant_id, us.name as tenant_name, us.email as tenant_email, us.phone as tenant_phone
       FROM units u
       LEFT JOIN users us ON u.id = us.unit_id AND us.role = 'tenant'
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json({ unit: result.rows[0] });
  } catch (error) {
    console.error('Get unit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create unit (Manager only)
router.post('/', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { unit_number, floor, building, type, rent_amount, maintenance_status } = req.body;

    await pool.query(
      `INSERT INTO units (unit_number, floor, building, type, rent_amount, status, maintenance_status)
       VALUES ($1, $2, $3, $4, $5, 'available', $6)`,
      [unit_number, floor, building, type, rent_amount || 0, maintenance_status || 'none']
    );

    const result = await pool.query(
      'SELECT * FROM units ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json({ message: 'Unit created successfully', unit: result.rows[0] });
  } catch (error) {
    console.
