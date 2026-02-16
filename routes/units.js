const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/database');

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
      query += ' AND u.building = ?';
      params.push(building);
    }

    if (floor) {
      query += ' AND u.floor = ?';
      params.push(parseInt(floor));
    }

    if (status) {
      query += ' AND u.status = ?';
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
       WHERE u.id = ?`,
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

// Create unit (Manager only - Staff cannot add units)
router.post('/', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { unit_number, floor, building, type, rent_amount } = req.body;

    await pool.query(
      `INSERT INTO units (unit_number, floor, building, type, rent_amount, status, maintenance_status)
       VALUES (?, ?, ?, ?, ?, 'available', ?)`,
      [unit_number, floor, building, type, rent_amount || 0, req.body.maintenance_status || 'none']
    );
    const result = await pool.query(
      'SELECT * FROM units ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json({ message: 'Unit created successfully', unit: result.rows[0] });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update unit (Manager only; status is auto available/occupied - not editable)
router.put('/:id', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { unit_number, floor, building, type, rent_amount, maintenance_status } = req.body;

    await pool.query(
      `UPDATE units 
       SET unit_number = ?, floor = ?, building = ?, type = ?, rent_amount = ?, maintenance_status = ?
       WHERE id = ?`,
      [unit_number, floor, building, type, rent_amount, maintenance_status || 'none', id]
    );
    const result = await pool.query('SELECT * FROM units WHERE id = ?', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json({ message: 'Unit updated successfully', unit: result.rows[0] });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete unit (Manager only)
router.delete('/:id', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if unit has tenants
    const tenantCheck = await pool.query(
      'SELECT id FROM users WHERE unit_id = ?',
      [id]
    );

    if (tenantCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Cannot delete unit with assigned tenants' });
    }

    const result = await pool.query('DELETE FROM units WHERE id = ?', [id]);

    if (result.rows[0].affectedRows === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
