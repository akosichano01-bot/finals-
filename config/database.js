const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'ancheta_apartment',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// Wrapped pool that returns { rows } like pg so existing code works
const pool = {
  query: async (sql, params) => {
    const [rows] = await rawPool.query(sql, params);
    return { rows: Array.isArray(rows) ? rows : [rows] };
  },
  getConnection: () => rawPool.getConnection(),
};

rawPool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = { pool, rawPool };
