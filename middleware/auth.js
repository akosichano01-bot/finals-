import jwt from 'jsonwebtoken';
import { poolExport as pool } from '../config/database.js';

// Middleware to verify JWT token and attach user to request
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // PostgreSQL: Ginagamit ang $1 placeholder
    const result = await pool.query(
      'SELECT id, email, name, role, unit_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // I-attach ang user data sa request object
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to restrict access by role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role '${req.user.role}' is not authorized to access this resource` 
      });
    }

    next();
  };
};
