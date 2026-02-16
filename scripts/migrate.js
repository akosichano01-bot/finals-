const { rawPool } = require('../config/database');

const createTables = async () => {
  try {
    // Users table
    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        unit_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Units table
    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_number VARCHAR(50) NOT NULL,
        floor INT NOT NULL,
        building VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        rent_amount DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_unit_building (unit_number, building)
      )
    `);

    // Bills table
    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        due_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Payments table
    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'gcash',
        transaction_id VARCHAR(255),
        gcash_reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      )
    `);

    // Maintenance requests table
    await rawPool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        staff_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add foreign key for users.unit_id (after units exists)
    try {
      await rawPool.query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_unit
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
      `);
    } catch (e) {
      if (!e.message || (!e.message.includes('Duplicate') && e.code !== 'ER_DUP_KEYNAME')) throw e;
    }

    // Units: add maintenance_status if not exists (separate from status which is available/occupied only)
    try {
      await rawPool.query(`
        ALTER TABLE units ADD COLUMN maintenance_status VARCHAR(50) DEFAULT 'none'
      `);
    } catch (e) {
      if (!e.message || !e.message.includes('Duplicate column')) throw e;
    }

    // Indexes
    await rawPool.query('CREATE INDEX idx_users_email ON users(email)').catch(() => {});
    await rawPool.query('CREATE INDEX idx_users_role ON users(role)').catch(() => {});
    await rawPool.query('CREATE INDEX idx_bills_tenant_id ON bills(tenant_id)').catch(() => {});
    await rawPool.query('CREATE INDEX idx_bills_status ON bills(status)').catch(() => {});
    await rawPool.query('CREATE INDEX idx_payments_bill_id ON payments(bill_id)').catch(() => {});
    try {
      await rawPool.query('ALTER TABLE payments ADD COLUMN paymongo_link_id VARCHAR(255) NULL');
    } catch (e) {
      if (!e.message || !e.message.includes('Duplicate column')) throw e;
    }
    await rawPool.query('CREATE INDEX idx_maintenance_tenant_id ON maintenance_requests(tenant_id)').catch(() => {});

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

createTables()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
