// config/database.js
// Postgres connection helper (works for local docker-compose and Render DATABASE_URL)
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isProd = process.env.NODE_ENV === 'production';
const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  (isProd && !!process.env.DATABASE_URL); // Render-style

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'ancheta_apartment',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

// Internal pool instance (export wrappers below to avoid accidental .end() usage from routes)
const internalPool = new Pool({
  ...poolConfig,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
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
