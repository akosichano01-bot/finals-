const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files mula sa root at public folder
app.use(express.static(path.join(__dirname))); 
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/units', require('./routes/units'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ancheta Apartment API is running' });
});

// --- ITO ANG DAGDAG NA FIX PARA SA "CANNOT GET /LOGIN" ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
// -------------------------------------------------------

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  try {
    await pool.query('SELECT 1 as ok');
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }

  if (process.env.PAYMONGO_SECRET_KEY) {
    console.log('✅ PayMongo configured (tenant payments)');
  }
});

module.exports = app;

