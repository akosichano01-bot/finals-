const express = require('express');
const { authenticate } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Get dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;
    let dashboardData = {};

    if (userRole === 'manager' || userRole === 'staff') {
      // Manager/Staff Dashboard
      const [
        totalUnits,
        occupiedUnits,
        totalTenants,
        totalBills,
        unpaidBills,
        totalPayments,
        pendingMaintenance
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM units'),
        pool.query("SELECT COUNT(*) as count FROM units WHERE status = 'occupied'"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'tenant'"),
        pool.query('SELECT COUNT(*) as count FROM bills'),
        pool.query("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM bills WHERE status = 'unpaid'"),
        pool.query("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"),
        pool.query("SELECT COUNT(*) as count FROM maintenance_requests WHERE status = 'pending'")
      ]);

      dashboardData = {
        stats: {
          totalUnits: parseInt(totalUnits.rows[0].count),
          occupiedUnits: parseInt(occupiedUnits.rows[0].count),
          availableUnits: parseInt(totalUnits.rows[0].count) - parseInt(occupiedUnits.rows[0].count),
          totalTenants: parseInt(totalTenants.rows[0].count),
          totalBills: parseInt(totalBills.rows[0].count),
          unpaidBills: {
            count: parseInt(unpaidBills.rows[0].count),
            total: parseFloat(unpaidBills.rows[0].total)
          },
          totalPayments: {
            count: parseInt(totalPayments.rows[0].count),
            total: parseFloat(totalPayments.rows[0].total)
          },
          pendingMaintenance: parseInt(pendingMaintenance.rows[0].count)
        }
      };

      // Recent bills
      const recentBills = await pool.query(
        `SELECT b.*, u.name as tenant_name, un.unit_number
         FROM bills b
         JOIN users u ON b.tenant_id = u.id
         LEFT JOIN units un ON u.unit_id = un.id
         ORDER BY b.created_at DESC
         LIMIT 10`
      );
      dashboardData.recentBills = recentBills.rows;

      // Recent payments
      const recentPayments = await pool.query(
        `SELECT p.*, u.name as tenant_name, un.unit_number, b.type as bill_type
         FROM payments p
         JOIN bills b ON p.bill_id = b.id
         JOIN users u ON b.tenant_id = u.id
         LEFT JOIN units un ON u.unit_id = un.id
         ORDER BY p.created_at DESC
         LIMIT 10`
      );
      dashboardData.recentPayments = recentPayments.rows;

    } else if (userRole === 'tenant') {
      // Tenant Dashboard
      const [
        unpaidBills,
        totalPayments,
        pendingMaintenance
      ] = await Promise.all([
        pool.query(
          "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM bills WHERE tenant_id = ? AND status = 'unpaid'",
          [req.user.id]
        ),
        pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(p.amount), 0) as total 
           FROM payments p
           JOIN bills b ON p.bill_id = b.id
           WHERE b.tenant_id = ? AND p.status = 'completed'`,
          [req.user.id]
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM maintenance_requests WHERE tenant_id = ? AND status = 'pending'",
          [req.user.id]
        )
      ]);

      // Get tenant's unit info
      const unitInfo = await pool.query(
        `SELECT un.* FROM units un
         JOIN users u ON un.id = u.unit_id
         WHERE u.id = ?`,
        [req.user.id]
      );

      dashboardData = {
        stats: {
          unpaidBills: {
            count: parseInt(unpaidBills.rows[0].count),
            total: parseFloat(unpaidBills.rows[0].total)
          },
          totalPayments: {
            count: parseInt(totalPayments.rows[0].count),
            total: parseFloat(totalPayments.rows[0].total)
          },
          pendingMaintenance: parseInt(pendingMaintenance.rows[0].count),
          unit: unitInfo.rows[0] || null
        }
      };

      // Recent bills
      const recentBills = await pool.query(
        `SELECT b.*, un.unit_number
         FROM bills b
         LEFT JOIN users u ON b.tenant_id = u.id
         LEFT JOIN units un ON u.unit_id = un.id
         WHERE b.tenant_id = ?
         ORDER BY b.created_at DESC
         LIMIT 10`,
        [req.user.id]
      );
      dashboardData.recentBills = recentBills.rows;

      // Recent payments
      const recentPayments = await pool.query(
        `SELECT p.*, b.type as bill_type, un.unit_number
         FROM payments p
         JOIN bills b ON p.bill_id = b.id
         LEFT JOIN users u ON b.tenant_id = u.id
         LEFT JOIN units un ON u.unit_id = un.id
         WHERE b.tenant_id = ?
         ORDER BY p.created_at DESC
         LIMIT 10`,
        [req.user.id]
      );
      dashboardData.recentPayments = recentPayments.rows;
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
