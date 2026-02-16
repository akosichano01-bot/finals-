const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Get all maintenance requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = `
      SELECT m.*, 
             u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
             un.unit_number, un.building, un.floor
      FROM maintenance_requests m
      JOIN users u ON m.tenant_id = u.id
      LEFT JOIN units un ON u.unit_id = un.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Tenants can only see their own requests
    if (req.user.role === 'tenant') {
      query += ' AND m.tenant_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND m.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY m.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get maintenance requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get maintenance request by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT m.*, 
              u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
              un.unit_number, un.building, un.floor
       FROM maintenance_requests m
       JOIN users u ON m.tenant_id = u.id
       LEFT JOIN units un ON u.unit_id = un.id
       WHERE m.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    const request = result.rows[0];

    // Tenants can only view their own requests
    if (req.user.role === 'tenant' && request.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Get maintenance request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create maintenance request
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, priority, unit_id } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Tenants can only create requests for their own unit
    const tenantId = req.user.role === 'tenant' ? req.user.id : req.body.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    await pool.query(
      `INSERT INTO maintenance_requests (tenant_id, title, description, priority, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [tenantId, title, description, priority || 'medium']
    );
    const result = await pool.query(
      'SELECT * FROM maintenance_requests ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json({ message: 'Maintenance request created successfully', request: result.rows[0] });
  } catch (error) {
    console.error('Create maintenance request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update maintenance request
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, staff_notes } = req.body;

    // Get current request
    const currentRequest = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [id]);
    if (currentRequest.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    // Tenants can only update their own requests (and only certain fields)
    if (req.user.role === 'tenant') {
      if (currentRequest.rows[0].tenant_id !== req.user.id) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      // Tenants can only update title and description
      await pool.query(
        'UPDATE maintenance_requests SET title = ?, description = ? WHERE id = ?',
        [title, description, id]
      );
      const result = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [id]);
      return res.json({ message: 'Maintenance request updated successfully', request: result.rows[0] });
    }

    // Staff and Manager can update all fields
    await pool.query(
      `UPDATE maintenance_requests 
       SET title = ?, description = ?, priority = ?, status = ?, staff_notes = ?
       WHERE id = ?`,
      [title, description, priority, status, staff_notes, id]
    );
    const result = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [id]);
    res.json({ message: 'Maintenance request updated successfully', request: result.rows[0] });
  } catch (error) {
    console.error('Update maintenance request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete maintenance request (Manager only)
router.delete('/:id', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM maintenance_requests WHERE id = ?', [id]);

    if (result.rows[0].affectedRows === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Delete maintenance request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
