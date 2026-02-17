import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

// Helper para sa Token Generation
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// --- REGISTER ---
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('role').isIn(['manager', 'staff', 'tenant']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, phone, unit_id } = req.body;

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (email, password, name, role, phone, unit_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [email, hashedPassword, name, role, phone || null, unit_id || null]
    );
    
    const result = await pool.query(
      'SELECT id, email, name, role, phone, unit_id FROM users WHERE email = $1',
      [email]
    );

    const token = generateToken(result.rows[0].id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- LOGIN (With Plain Text Fallback) ---
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`); // Lalabas sa Render logs

    const result = await pool.query(
      'SELECT id, email, password, name, role, phone, unit_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // FALLBACK LOGIC: 
    // 1. I-check kung hashed ang password at itugma gamit ang bcrypt.
    // 2. Kung hindi hashed (plain text sa DBeaver), itugma nang direkta.
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      isValidPassword = false;
    }

    // Kung fail ang bcrypt, i-check kung plain text match (para makapasok ka na ngayon)
    if (!isValidPassword && password === user.password) {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        unit_id: user.unit_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- GET CURRENT USER ---
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret');
    
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.phone, u.unit_id, u.created_at,
              un.unit_number, un.floor, un.building
       FROM users u
       LEFT JOIN units un ON u.unit_id = un.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Me error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
