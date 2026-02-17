import express from 'express';
import { authenticate } from '../middleware/auth.js'; 
import { poolExport as pool } from '../config/database.js'; 

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;
    let dashboardData = {
      stats: {},
      recentBills: [],
      recentPayments: []
    };

    // Helper function para hindi mag-crash ang dashboard kung may kulang na table
    const safeQuery = async (query, params = []) => {
      try {
        return await pool.query(query, params);
      } catch (err) {
        console.error(`⚠️ Database Error: ${err.message}`); // Lalabas ito sa Render Logs
        return { rows: [{ count: 0, total: 0 }] };
      }
    };

    if (userRole === 'manager' || userRole === 'staff') {
      const [
        totalUnits,
        occupiedUnits,
        totalTenants,
        totalBills,
        unpaidBills,
        totalPayments,
        pendingMaintenance
      ] = await Promise.all([
        safeQuery('SELECT COUNT(*) as count FROM units'),
        safeQuery("SELECT COUNT(*) as count FROM units WHERE status = 'occupied'"),
        safeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'tenant'"),
        safeQuery('SELECT COUNT(*) as count FROM bills'),
        safeQuery("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM bills WHERE status = 'unpaid'"),
        safeQuery("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"),
        safeQuery("SELECT COUNT(*) as count FROM maintenance WHERE status = 'pending'")
      ]);

      dashboardData.stats = {
        totalUnits: parseInt(totalUnits.rows[0]?.count) || 0,
        occupiedUnits: parseInt(occupiedUnits.rows[0]?.count) || 0,
        availableUnits: (parseInt(totalUnits.rows[0]?.count) || 0) - (parseInt(occupiedUnits.rows[0]?.count) || 0),
        totalTenants: parseInt(totalTenants.rows[0]?.count) || 0,
        totalBills: parseInt(totalBills.rows[0]?.count) || 0,
        unpaidBills: {
          count: parseInt(unpaidBills.rows[0]?.count) || 0,
          total: parseFloat(unpaidBills.rows[0]?.total) || 0
        },
        totalPayments: {
          count: parseInt(totalPayments.rows[0]?.count) || 0,
          total: parseFloat(totalPayments.rows[0]?.total) || 0
        },
        pendingMaintenance: parseInt(pendingMaintenance.rows[0]?.count) || 0
      };

      const billsRes = await safeQuery(
        `SELECT b.*, u.name as tenant_name, un.unit_number
         FROM bills b
         JOIN users u ON b.tenant_id = u.id
         LEFT JOIN units un ON u.unit_id = un.id
         ORDER BY b.created_at DESC
         LIMIT 10`
      );
      dashboardData.recentBills = billsRes.rows || [];

    } else if (userRole === 'tenant') {
      const [unpaidBills, totalPayments, pendingMaintenance] = await Promise.all([
        safeQuery("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM bills WHERE tenant_id = $1 AND status = 'unpaid'", [req.user.id]),
        safeQuery(`SELECT COUNT(*) as count, COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN bills b ON p.bill_id = b.id WHERE b.tenant_id = $1 AND p.status = 'completed'`, [req.user.id]),
        safeQuery("SELECT COUNT(*) as count FROM maintenance WHERE tenant_id = $1 AND status = 'pending'", [req.user.id])
      ]);

      dashboardData.stats = {
        unpaidBills: {
          count: parseInt(unpaidBills.rows[0]?.count) || 0,
          total: parseFloat(unpaidBills.rows[0]?.total) || 0
        },
        totalPayments: {
          count: parseInt(totalPayments.rows[0]?.count) || 0,
          total: parseFloat(totalPayments.rows[0]?.total) || 0
        },
        pendingMaintenance: parseInt(pendingMaintenance.rows[0]?.count) || 0
      };

      const billsRes = await safeQuery(`SELECT b.* FROM bills b WHERE b.tenant_id = $1 ORDER BY b.created_at DESC LIMIT 10`, [req.user.id]);
      dashboardData.recentBills = billsRes.rows || [];
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Final Dashboard error:', error.message);
    res.status(200).json({
      stats: { totalUnits: 0, occupiedUnits: 0, availableUnits: 0, totalTenants: 0, unpaidBills: {count:0, total:0}, totalPayments: {count:0, total:0}, pendingMaintenance: 0 },
      recentBills: [],
      recentPayments: []
    });
  }
});

export default router;
