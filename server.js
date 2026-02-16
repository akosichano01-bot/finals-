import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes (Siguraduhing may .js extension sa dulo para sa ES Modules)
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import unitRoutes from './routes/units.js';
import tenantRoutes from './routes/tenants.js';
import billRoutes from './routes/bills.js';
import paymentRoutes from './routes/payments.js';
import maintenanceRoutes from './routes/maintenance.js';
import dashboardRoutes from './routes/dashboard.js';

import { pool } from './config/database.js';

// Load .env
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// Kinakailangan ito para makuha ang __dirname sa ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS CONFIGURATION ---
app.use(cors({
  origin: [
    'https://finals-tenant-system.onrender.com', 
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- STATIC FILES ---
// Nakaturo na ito sa 'dist' folder sa root base sa image_a46bc1.png
app.use(express.static(path.join(__dirname, 'dist'))); 
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ancheta Apartment API is running' });
});

// --- FIX PARA SA "NO SUCH FILE index.html" ---
// Pinupuwersa ang lahat ng non-API requests sa index.html sa root dist folder
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
  console.log(`🚀 Server running on port ${PORT}`);
  
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }

  if (process.env.PAYMONGO_SECRET_KEY) {
    console.log('✅ PayMongo configured');
  }
});

export default app;


