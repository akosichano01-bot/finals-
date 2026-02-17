import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { poolExport as pool } from '../config/database.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Processing login for: ${email}`);

  try {
    // 1. Query sa database
    const result = await pool.query(
      'SELECT id, email, password, name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log("User not found in database");
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // 2. Password Matching (Hashed or Plain Text Fallback)
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (err) {
      isMatch = false;
    }

    // Kung hindi hashed ang password sa DBeaver, icheck kung plain text match
    if (!isMatch && password === user.password) {
      isMatch = true;
    }

    if (!isMatch) {
      console.log("Password mismatch");
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Token Generation
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );

    console.log("Login successful! Sending token.");
    
    // 4. Send Response (Dapat JSON ito)
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Database/Server Error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /me para sa AuthContext persistence
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
