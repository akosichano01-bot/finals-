// scripts/migrate.js
// Creates Postgres tables for the app (ESM + pg).
import { rawPool } from '../config/database.js';

async function createTables() {
  try {
    // 1) Core tables (order matters due to FKs)
    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        unit_number VARCHAR(50) NOT NULL,
        floor INT NOT NULL,
        building VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        rent_amount NUMERIC(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'available',
        maintenance_status VARCHAR(50) DEFAULT 'none',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_unit_building UNIQUE (unit_number, building)
      )
    `);

    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        unit_id INT REFERENCES units(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT,
        due_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'unpaid',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        bill_id INT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'gcash',
        transaction_id VARCHAR(255),
        gcash_reference VARCHAR(255),
        paymongo_link_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        staff_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2) Indexes (idempotent)
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_users_unit_id ON users(unit_id)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_units_status ON units(status)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_bills_tenant_id ON bills(tenant_id)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON maintenance_requests(tenant_id)');
    await rawPool.query('CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status)');

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

createTables()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
