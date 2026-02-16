const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Get all users (Manager and Staff only)
router.get('/', authenticate, authorize('manager', 'staff'), async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.phone, u.unit_id, u.created_at,
             un.unit_number, un.floor, un.building
      FROM users u
      LEFT JOIN units un ON u.unit_id = un.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're manager/staff
    if (req.user.role !== 'manager' && req.user.role !== 'staff' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.phone, u.unit_id, u.created_at,
              un.unit_number, un.floor, un.building
       FROM users u
       LEFT JOIN units un ON u.unit_id = un.id
       WHERE u.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    // Users can only update their own profile unless they're manager
    if (req.user.role !== 'manager' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await pool.query(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone, id]
    );
    const result = await pool.query(
      'SELECT id, email, name, role, phone, unit_id FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Manager only)
router.delete('/:id', authenticate, authorize('manager'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.rows[0].affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
