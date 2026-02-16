import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import unitRoutes from './routes/units.js';
import tenantRoutes from './routes/tenants.js';
import billRoutes from './routes/bills.js';
import paymentRoutes from './routes/payments.js';
import maintenanceRoutes from './routes/maintenance.js';
import dashboardRoutes from './routes/dashboard.js';

import { poolExport as pool } from './config/database.js';

dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS ---
app.use(cors({
  origin: ['https://finals-tenant-system.onrender.com', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- STATIC FILES FIX ---
// Siguraduhin na ang 'dist' folder ay binabasa bilang static root
app.use(express.static(path.join(__dirname, 'dist')));

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
  res.json({ status: 'ok', message: 'API is running' });
});

// --- SPA FALLBACK FIX ---
// Importante ito para sa React Router: lahat ng hindi API request ay ituturo sa index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
});

export default app;
