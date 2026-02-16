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
    // Pinapayagan nito ang connection sa Render/Aiven PostgreSQL
    rejectUnauthorized: false 
  }
});

// --- ITO ANG MGA EXPORTS ---

// 1. Named export na 'pool' para sa server.js line 17
export const pool = {
  query: (text, params) => pool.query(text, params),
};

// 2. Named export na 'poolExport' para sa compatibility ng mga routes mo
export const poolExport = pool;

// 3. Raw pool para sa mga advanced functions
export const rawPool = pool;

// 4. Default export (para sigurado)
export default pool;
