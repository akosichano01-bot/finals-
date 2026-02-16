import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Kinakailangan ang __dirname para mahanap ang .env sa root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env mula sa root folder
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // ITO ANG FIX: Pinapayagan nito ang self-signed certificate ng Aiven
    rejectUnauthorized: false 
  }
});

// ES Module Export
export const poolExport = {
  query: (text, params) => pool.query(text, params),
};

export const rawPool = pool;

// Default export para sa compatibility
export default {
  pool: poolExport,
  rawPool: pool
};
