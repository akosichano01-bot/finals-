import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Binago ang pangalan dito sa 'internalPool' para hindi mag-conflict sa exports
const internalPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

// --- ITO ANG MGA EXPORTS ---

// 1. Named export na 'pool' para sa server.js line 17
export const pool = {
  query: (text, params) => internalPool.query(text, params),
};

// 2. Named export na 'poolExport' para sa compatibility ng mga routes mo
export const poolExport = pool;

// 3. Raw pool para sa mga advanced functions (kung kailangan ng internalPool methods)
export const rawPool = internalPool;

// 4. Default export (para sigurado)
export default pool;
