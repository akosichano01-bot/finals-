const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env - Mas safe na config para sa Render
dotenv.config(); 

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DITO ANG FIX PARA SA CORS ---
app.use(cors({
  origin: [
    'https://finals-tenant-system.onrender.com', // Iyong live frontend URL
    'http://localhost:5173'                      // Para sa local testing mo
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
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

// Fix para sa Client-side routing (React/Vite)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, async () => {
  // Sa Render, gagamitin nito ang PORT na 10000
  console.log(`🚀 Server running on port ${PORT}`);
  
  try {
  await pool.query('SELECT 1'); // Inalis natin ang [result]
  console.log('✅ Database connected');
} catch (error) {
  console.error('❌ Database connection error:', error.message);
}

  if (process.env.PAYMONGO_SECRET_KEY) {
    console.log('✅ PayMongo configured');
  }
});

module.exports = app;


