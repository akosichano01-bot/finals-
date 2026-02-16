const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // ITO ANG FIX: Pinapayagan nito ang self-signed certificate ng Aiven
    rejectUnauthorized: false 
  }
});

module.exports = {
  pool: {
    query: (text, params) => pool.query(text, params),
  },
  rawPool: pool
};
